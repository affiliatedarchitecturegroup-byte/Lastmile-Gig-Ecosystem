// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - Rate Limiting Middleware
// Phase: P063 | Sliding window rate limiter via Upstash Redis
// -------------------------------------------------------------------

import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/** Rate limit configuration per tier */
interface RateLimitTier {
  windowMs: number;
  maxRequests: number;
}

/** Rate limit tiers */
const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  anonymous: { windowMs: 60_000, maxRequests: 30 },
  customer: { windowMs: 60_000, maxRequests: 100 },
  driver: { windowMs: 60_000, maxRequests: 200 },
  partner: { windowMs: 60_000, maxRequests: 200 },
  developer: { windowMs: 60_000, maxRequests: 500 },
  admin: { windowMs: 60_000, maxRequests: 1000 },
  internal: { windowMs: 60_000, maxRequests: 5000 },
};

/** Rate limit response headers */
interface RateLimitHeaders {
  'X-RateLimit-Limit': number;
  'X-RateLimit-Remaining': number;
  'X-RateLimit-Reset': number;
  'Retry-After'?: number;
}

/**
 * Sliding window rate limiter using Upstash Redis.
 * Supports per-IP and per-API-key rate limiting with tiered limits.
 *
 * Headers returned on every response:
 * - X-RateLimit-Limit: Maximum requests per window
 * - X-RateLimit-Remaining: Remaining requests in window
 * - X-RateLimit-Reset: Timestamp when window resets
 * - Retry-After: Seconds until next allowed request (only on 429)
 */
@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimiterMiddleware.name);
  private readonly redisUrl: string;

  constructor() {
    this.redisUrl = process.env['LMG_UPSTASH_REDIS_URL'] || '';
  }

  async use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const identifier = this.getIdentifier(req);
    const tier = this.getTier(req);
    const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS['anonymous'];

    try {
      const result = await this.checkRateLimit(
        identifier,
        config.windowMs,
        config.maxRequests,
      );

      // Set rate limit headers
      const headers: RateLimitHeaders = {
        'X-RateLimit-Limit': config.maxRequests,
        'X-RateLimit-Remaining': Math.max(0, result.remaining),
        'X-RateLimit-Reset': result.resetAt,
      };

      res.set(headers as Record<string, string | number>);

      if (!result.allowed) {
        const retryAfter = Math.ceil(
          (result.resetAt - Date.now()) / 1000,
        );
        res.set('Retry-After', String(retryAfter));

        this.logger.warn(
          `Rate limit exceeded for ${identifier} (tier: ${tier})`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // If Redis is down, allow the request (fail open) but log warning
      this.logger.error(
        `Rate limiter error: ${error instanceof Error ? error.message : 'Unknown'}. Failing open.`,
      );
      next();
    }
  }

  /** Get unique identifier for rate limiting (API key or IP) */
  private getIdentifier(req: Request): string {
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return `apikey:${apiKey.substring(0, 20)}`;
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || req.ip || 'unknown';

    return `ip:${ip}`;
  }

  /** Determine rate limit tier from request context */
  private getTier(req: Request): string {
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return 'developer';
    }

    const authenticatedReq = req as Record<string, unknown>;
    const roles = (authenticatedReq['roles'] as string[]) || [];

    if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
      return 'admin';
    }
    if (roles.includes('OPS_SENIOR') || roles.includes('OPS_STAFF')) {
      return 'admin';
    }
    if (roles.includes('DRIVER')) {
      return 'driver';
    }
    if (roles.includes('PARTNER_ADMIN') || roles.includes('PARTNER_STAFF')) {
      return 'partner';
    }
    if (roles.includes('CUSTOMER')) {
      return 'customer';
    }

    return 'anonymous';
  }

  /**
   * Sliding window rate limit check using Upstash Redis.
   * Uses sorted sets with timestamp-based members for precise windows.
   */
  private async checkRateLimit(
    identifier: string,
    windowMs: number,
    maxRequests: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = `ratelimit:${identifier}`;

    // Upstash Redis HTTP API call (REST-based)
    const pipeline = [
      // Remove expired entries
      ['ZREMRANGEBYSCORE', key, '0', String(windowStart)],
      // Count current entries
      ['ZCARD', key],
      // Add current request
      ['ZADD', key, String(now), `${now}:${Math.random().toString(36).substring(2)}`],
      // Set expiry
      ['PEXPIRE', key, String(windowMs)],
    ];

    try {
      const response = await fetch(`${this.redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env['LMG_UPSTASH_REDIS_TOKEN'] || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      });

      if (!response.ok) {
        throw new Error(`Redis pipeline failed: ${response.status}`);
      }

      const results = (await response.json()) as Array<{ result: number }>;
      const currentCount = results[1]?.result || 0;
      const remaining = maxRequests - currentCount - 1;
      const resetAt = now + windowMs;

      return {
        allowed: currentCount < maxRequests,
        remaining: Math.max(0, remaining),
        resetAt,
      };
    } catch (error) {
      this.logger.error(`Redis rate limit check failed: ${error}`);
      // Fail open on Redis errors
      return { allowed: true, remaining: maxRequests, resetAt: now + windowMs };
    }
  }
}
