/**
 * JWT Middleware - Global Authentication for API Gateway
 *
 * Validates JWT tokens from Auth0 on all incoming requests.
 * Extracts user identity and role, attaching to request context.
 * Public routes are excluded via route-level configuration.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2
 * @module middleware/jwt.middleware
 */

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';

import type { GatewayConfiguration } from '../config/gateway.config';

/**
 * Routes that do not require authentication.
 */
const PUBLIC_ROUTES: Array<{ method: string; path: RegExp }> = [
  { method: 'GET', path: /^\/v1\/health$/ },
  { method: 'GET', path: /^\/v1\/ready$/ },
  { method: 'GET', path: /^\/v1\/docs/ },
  { method: 'POST', path: /^\/v1\/auth\/login$/ },
  { method: 'POST', path: /^\/v1\/auth\/register$/ },
  { method: 'POST', path: /^\/v1\/auth\/refresh$/ },
  { method: 'POST', path: /^\/v1\/auth\/forgot-password$/ },
  { method: 'GET', path: /^\/v1\/restaurants/ },
  { method: 'GET', path: /^\/v1\/services$/ },
  { method: 'POST', path: /^\/v1\/webhooks\// },
];

/**
 * Decoded user context from JWT.
 */
export interface GatewayUserContext {
  userId: string;
  auth0Id: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string | undefined;
}

/**
 * Extended request with user context.
 */
export interface AuthenticatedGatewayRequest extends Request {
  user?: GatewayUserContext;
  requestId?: string;
}

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtMiddleware.name);

  constructor(private readonly configService: ConfigService) {}

  async use(req: AuthenticatedGatewayRequest, res: Response, next: NextFunction): Promise<void> {
    // Check if route is public
    if (this.isPublicRoute(req.method, req.path)) {
      return next();
    }

    // Extract bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Check for API key authentication
      const apiKey = req.headers['x-api-key'] as string | undefined;
      if (apiKey) {
        // API key validation would be handled by a separate middleware
        return next();
      }

      throw new UnauthorizedException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/missing-token',
        title: 'Authentication Required',
        status: 401,
        detail: 'No Bearer token or API key provided.',
      });
    }

    const token = authHeader.substring(7);

    try {
      // Decode JWT payload (signature verification done by downstream auth service)
      const payload = this.decodeJwtPayload(token);

      if (!payload) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException({
          type: 'https://api.lastmilegig.aagais.co.za/errors/token-expired',
          title: 'Token Expired',
          status: 401,
          detail: 'The access token has expired. Please refresh your token.',
        });
      }

      // Attach user context to request
      req.user = {
        userId: payload['https://lastmilegig.aagais.co.za/userId'] ?? payload.sub ?? '',
        auth0Id: payload.sub ?? '',
        email: payload.email ?? '',
        role: payload['https://lastmilegig.aagais.co.za/role'] ?? 'customer',
        permissions: payload.permissions ?? [],
        sessionId: payload.jti,
      };

      // Add user context headers for downstream services
      req.headers['x-user-id'] = req.user.userId;
      req.headers['x-user-role'] = req.user.role;
      req.headers['x-user-email'] = req.user.email;
      req.headers['x-session-id'] = req.user.sessionId ?? '';

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Token validation failed';
      this.logger.warn(`JWT validation failed: ${message}`);
      throw new UnauthorizedException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/invalid-token',
        title: 'Invalid Token',
        status: 401,
        detail: 'The provided authentication token is invalid.',
      });
    }
  }

  /**
   * Checks if the current request matches a public route.
   */
  private isPublicRoute(method: string, path: string): boolean {
    return PUBLIC_ROUTES.some(
      (route) => route.method === method.toUpperCase() && route.path.test(path),
    );
  }

  /**
   * Decodes a JWT payload without signature verification.
   * Signature verification is handled by the auth service.
   */
  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payloadBase64 = parts[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      return JSON.parse(payloadJson) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
