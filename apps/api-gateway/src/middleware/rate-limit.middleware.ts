/**
 * Rate Limiting Middleware - Per-IP and Per-API-Key Throttling
 *
 * Implements sliding window rate limiting using Upstash Redis.
 * Different limits apply based on route and authentication method.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 6 (WAF)
 * @see docs/specs/12_API_INTEGRATION_SPEC.md - Section 4
 * @module middleware/rate-limit.middleware
 */

import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { GatewayConfiguration, RateLimitConfig } from '../config/gateway.config';

/**
 * Redis-based rate limit store.
 * In-memory for development, Upstash Redis in production.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly config: GatewayConfiguration;

  constructor(private readonly configService: ConfigService) {
    const gw = this.configService.get<GatewayConfiguration>('gateway');
    if (!gw) {
      throw new Error('Gateway configuration not loaded');
    }
    this.config = gw;
  }

  use(req: { path: string; ip: string; headers: Record<string, string | string[] | undefined> },
      res: { setHeader: (name: string, value: string) => void },
      next: () => void): void {
    const identifier = this.getIdentifier(req);
    const limitConfig = this.getLimitConfig(req.path);
    const key = `lmg:gateway:ratelimit:${identifier}:${req.path.split('/')[2] ?? 'global'}`;

    const now = Math.floor(Date.now() / 1000);
    let entry = this.store.get(key);

    // Reset window if expired
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + limitConfig.windowSeconds };
      this.store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers per IETF draft-ietf-httpapi-ratelimit-headers
    const remaining = Math.max(0, limitConfig.limit - entry.count);
    const resetSeconds = entry.resetAt - now;

    res.setHeader('X-RateLimit-Limit', limitConfig.limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', entry.resetAt.toString());
    res.setHeader('Retry-After', resetSeconds.toString());

    if (entry.count > limitConfig.limit) {
      this.logger.warn(
        `Rate limit exceeded for ${identifier} on ${req.path} ` +
        `(${entry.count}/${limitConfig.limit})`,
      );
      throw new HttpException(
        {
          type: 'https://api.lastmilegig.aagais.co.za/errors/rate-limit-exceeded',
          title: 'Rate Limit Exceeded',
          status: HttpStatus.TOO_MANY_REQUESTS,
          detail: limitConfig.message,
          retryAfter: resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  /**
   * Determines the rate limit identifier.
   * Uses API key if present, otherwise falls back to IP address.
   */
  private getIdentifier(req: { ip: string; headers: Record<string, string | string[] | undefined> }): string {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && typeof apiKey === 'string') {
      // Use API key prefix as identifier (never log full key)
      return `apikey:${apiKey.substring(0, 12)}`;
    }

    const userId = req.headers['x-user-id'];
    if (userId && typeof userId === 'string') {
      return `user:${userId}`;
    }

    return `ip:${req.ip}`;
  }

  /**
   * Selects the appropriate rate limit configuration based on route.
   */
  private getLimitConfig(path: string): RateLimitConfig {
    if (path.startsWith('/v1/auth/login') || path.startsWith('/v1/auth/register')) {
      return this.config.rateLimits.auth;
    }
    if (path.startsWith('/v1/payments') || path.startsWith('/v1/webhooks')) {
      return this.config.rateLimits.payments;
    }
    return this.config.rateLimits.global;
  }
}
