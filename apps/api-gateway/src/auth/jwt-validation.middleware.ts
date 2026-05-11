// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - JWT Validation Middleware
// Phase: P061 | Reusable JWT guard for all NestJS services
// -------------------------------------------------------------------

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jose from 'jose';

/** Decoded JWT payload with LMG-specific claims */
export interface LmgJwtPayload {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  azp: string;
  scope: string;
  'https://lastmilegig.aagais.co.za/roles': string[];
  'https://lastmilegig.aagais.co.za/permissions': string[];
}

/** Extended Express Request with user context */
export interface AuthenticatedRequest extends Request {
  user: LmgJwtPayload;
  roles: string[];
  permissions: string[];
  userId: string;
}

/** Configuration for JWT validation */
interface JwtValidationConfig {
  auth0Domain: string;
  auth0Audience: string;
  cognitoDomain: string;
  cognitoPoolId: string;
}

@Injectable()
export class JwtValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtValidationMiddleware.name);
  private auth0JWKS: jose.JWTVerifyGetKey | undefined;
  private cognitoJWKS: jose.JWTVerifyGetKey | undefined;

  private readonly config: JwtValidationConfig = {
    auth0Domain: process.env['LMG_AUTH0_DOMAIN'] || '',
    auth0Audience: process.env['LMG_AUTH0_AUDIENCE'] || 'https://api.lastmilegig.aagais.co.za',
    cognitoDomain: process.env['LMG_COGNITO_DOMAIN'] || '',
    cognitoPoolId: process.env['LMG_COGNITO_POOL_ID'] || '',
  };

  async use(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const payload = await this.validateToken(token);
      const authenticatedReq = req as AuthenticatedRequest;

      authenticatedReq.user = payload;
      authenticatedReq.userId = payload.sub;
      authenticatedReq.roles =
        payload['https://lastmilegig.aagais.co.za/roles'] || [];
      authenticatedReq.permissions =
        payload['https://lastmilegig.aagais.co.za/permissions'] || [];

      next();
    } catch (error) {
      this.logger.warn(
        `JWT validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Validate token against Auth0 or Cognito issuer */
  private async validateToken(token: string): Promise<LmgJwtPayload> {
    // Decode header to determine issuer
    const decodedHeader = jose.decodeProtectedHeader(token);
    const decodedPayload = jose.decodeJwt(token);
    const issuer = decodedPayload.iss as string;

    if (issuer && issuer.includes('auth0.com')) {
      return this.validateAuth0Token(token);
    }

    if (issuer && issuer.includes('cognito-idp')) {
      return this.validateCognitoToken(token);
    }

    throw new UnauthorizedException(`Unknown token issuer: ${issuer}`);
  }

  /** Validate Auth0-issued JWT */
  private async validateAuth0Token(token: string): Promise<LmgJwtPayload> {
    if (!this.auth0JWKS) {
      this.auth0JWKS = jose.createRemoteJWKSet(
        new URL(`https://${this.config.auth0Domain}/.well-known/jwks.json`),
      );
    }

    const { payload } = await jose.jwtVerify(token, this.auth0JWKS, {
      issuer: `https://${this.config.auth0Domain}/`,
      audience: this.config.auth0Audience,
      algorithms: ['RS256'],
      clockTolerance: 30,
    });

    return payload as unknown as LmgJwtPayload;
  }

  /** Validate AWS Cognito-issued JWT */
  private async validateCognitoToken(token: string): Promise<LmgJwtPayload> {
    const region = process.env['LMG_AWS_REGION'] || 'af-south-1';
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${this.config.cognitoPoolId}/.well-known/jwks.json`;

    if (!this.cognitoJWKS) {
      this.cognitoJWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
    }

    const { payload } = await jose.jwtVerify(token, this.cognitoJWKS, {
      issuer: `https://cognito-idp.${region}.amazonaws.com/${this.config.cognitoPoolId}`,
      algorithms: ['RS256'],
      clockTolerance: 30,
    });

    // Map Cognito claims to LMG format
    return {
      ...payload,
      'https://lastmilegig.aagais.co.za/roles':
        (payload['custom:roles'] as string || '').split(',').filter(Boolean),
      'https://lastmilegig.aagais.co.za/permissions':
        (payload['custom:permissions'] as string || '').split(',').filter(Boolean),
    } as unknown as LmgJwtPayload;
  }
}
