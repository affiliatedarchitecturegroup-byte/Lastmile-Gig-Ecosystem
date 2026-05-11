/**
 * JWT Strategy - Auth0 RS256 Token Validation
 *
 * Implements Passport JWT strategy for validating Auth0-issued JWTs.
 * Uses JWKS (JSON Web Key Set) endpoint to verify RS256 signatures
 * without storing secrets locally.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2.1
 * @module strategies/jwt.strategy
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

import type { AuthConfiguration } from '../config/auth.config';

/**
 * Decoded JWT payload structure from Auth0.
 * Contains standard OIDC claims plus custom Lastmile Gig claims.
 */
export interface JwtPayload {
  /** Auth0 user ID (sub claim) */
  sub: string;
  /** User email from Auth0 */
  email: string;
  /** Whether email is verified */
  email_verified: boolean;
  /** Custom claim: Lastmile Gig user role */
  'https://lastmilegig.aagais.co.za/role': string;
  /** Custom claim: Lastmile Gig internal user ID */
  'https://lastmilegig.aagais.co.za/userId': string;
  /** Token audience */
  aud: string | string[];
  /** Token issuer */
  iss: string;
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
  /** JWT ID for revocation tracking */
  jti?: string;
  /** Authorized party (client ID) */
  azp?: string;
  /** Scopes granted */
  scope?: string;
  /** Permissions from RBAC */
  permissions?: string[];
}

/**
 * Validated user object attached to request after JWT validation.
 * This is what req.user contains in protected routes.
 */
export interface ValidatedUser {
  userId: string;
  auth0Id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  permissions: string[];
  sessionId: string | undefined;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const authConfig = configService.get<AuthConfiguration>('auth');
    if (!authConfig) {
      throw new Error('Auth configuration not loaded. Ensure authConfig is registered.');
    }

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${authConfig.auth0.domain}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: authConfig.auth0.audience,
      issuer: authConfig.jwt.issuer,
      algorithms: [authConfig.jwt.algorithm],
      ignoreExpiration: false,
    });
  }

  /**
   * Validates the decoded JWT payload and transforms it into a ValidatedUser.
   * Called automatically by Passport after signature verification succeeds.
   *
   * @param payload - Decoded JWT claims
   * @returns ValidatedUser object attached to request
   * @throws UnauthorizedException if payload is invalid
   */
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    if (!payload.sub) {
      this.logger.warn('JWT validation failed: missing sub claim');
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    if (!payload.email) {
      this.logger.warn('JWT validation failed: missing email claim');
      throw new UnauthorizedException('Invalid token: missing email');
    }

    const role = payload['https://lastmilegig.aagais.co.za/role'] ?? 'customer';
    const userId = payload['https://lastmilegig.aagais.co.za/userId'] ?? payload.sub;

    const user: ValidatedUser = {
      userId,
      auth0Id: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      role,
      permissions: payload.permissions ?? [],
      sessionId: payload.jti,
    };

    this.logger.debug(`JWT validated for user ${userId} with role ${role}`);
    return user;
  }
}

/**
 * Custom claim namespace for Lastmile Gig.
 * Auth0 requires custom claims to use a namespace URL.
 */
export const LMG_CLAIM_NAMESPACE = 'https://lastmilegig.aagais.co.za';

/**
 * Helper to extract custom claims from JWT payload.
 */
export function extractLmgClaim(payload: JwtPayload, claim: string): string | undefined {
  const key = `${LMG_CLAIM_NAMESPACE}/${claim}` as keyof JwtPayload;
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
}
