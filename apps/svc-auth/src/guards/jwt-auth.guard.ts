/**
 * JWT Authentication Guard
 *
 * Global guard that protects all routes by default.
 * Routes can be made public using the @Public() decorator.
 * Integrates with the JwtStrategy for Auth0 token validation.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2
 * @module guards/jwt-auth.guard
 */

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';

/**
 * Metadata key for marking routes as public (no auth required).
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route as public, bypassing JWT validation.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * getHealth() { ... }
 * ```
 */
export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Determines if the current request should be authenticated.
   * Checks for @Public() decorator first, then delegates to Passport.
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Called when Passport authentication fails or no token is provided.
   * Provides structured error messages per RFC 7807.
   */
  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: Error | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err) {
      this.logger.warn(`Authentication error: ${err.message}`);
      throw new UnauthorizedException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/unauthorized',
        title: 'Authentication Failed',
        status: 401,
        detail: 'The provided authentication credentials are invalid or expired.',
      });
    }

    if (!user) {
      const message = info?.message ?? 'No authentication token provided';
      this.logger.warn(`Authentication failed: ${message}`);
      throw new UnauthorizedException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/unauthorized',
        title: 'Authentication Required',
        status: 401,
        detail: message,
      });
    }

    return user;
  }
}

/**
 * Optional: Guard that allows requests with or without auth.
 * If a valid token is present, req.user is populated.
 * If no token, req.user is undefined but request proceeds.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(
    _err: Error | null,
    user: TUser | false,
  ): TUser | undefined {
    if (user) {
      return user;
    }
    return undefined as unknown as TUser;
  }
}
