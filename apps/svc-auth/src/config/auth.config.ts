/**
 * Auth Service Configuration
 *
 * Centralized configuration for Auth0, JWT, Redis session management,
 * and Supabase connection. All values sourced from environment variables
 * with LMG_ prefix per DEVELOPMENT_DIRECTIVES.md Section 10.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2
 * @module config/auth.config
 */

import { registerAs } from '@nestjs/config';

export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
  issuerBaseUrl: string;
}

export interface JwtConfig {
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  algorithm: string;
}

export interface RedisConfig {
  url: string;
  token: string;
  keyPrefix: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export interface AuthConfiguration {
  auth0: Auth0Config;
  jwt: JwtConfig;
  redis: RedisConfig;
  supabase: SupabaseConfig;
  environment: string;
  port: number;
  corsOrigins: string[];
}

export const authConfig = registerAs('auth', (): AuthConfiguration => {
  const environment = process.env['LMG_ENVIRONMENT'] ?? 'development';
  const auth0Domain = process.env['LMG_AUTH0_DOMAIN'] ?? 'dev-lastmilegig.us.auth0.com';

  return {
    auth0: {
      domain: auth0Domain,
      clientId: process.env['LMG_AUTH0_CLIENT_ID'] ?? '',
      clientSecret: process.env['LMG_AUTH0_CLIENT_SECRET'] ?? '',
      audience: process.env['LMG_AUTH0_AUDIENCE'] ?? 'https://api.lastmilegig.aagais.co.za',
      issuerBaseUrl: `https://${auth0Domain}/`,
    },
    jwt: {
      accessTokenExpiry: process.env['LMG_JWT_ACCESS_EXPIRY'] ?? '15m',
      refreshTokenExpiry: process.env['LMG_JWT_REFRESH_EXPIRY'] ?? '7d',
      issuer: `https://${auth0Domain}/`,
      algorithm: 'RS256',
    },
    redis: {
      url: process.env['LMG_UPSTASH_REDIS_URL'] ?? 'redis://localhost:6379',
      token: process.env['LMG_UPSTASH_REDIS_TOKEN'] ?? '',
      keyPrefix: 'lmg:auth:',
    },
    supabase: {
      url: process.env['LMG_SUPABASE_URL'] ?? 'http://localhost:54321',
      anonKey: process.env['LMG_SUPABASE_ANON_KEY'] ?? '',
      serviceRoleKey: process.env['LMG_SUPABASE_SERVICE_ROLE_KEY'] ?? '',
    },
    environment,
    port: parseInt(process.env['LMG_PORT_AUTH_SERVICE'] ?? '3001', 10),
    corsOrigins: environment === 'development'
      ? ['http://localhost:3000', 'http://localhost:4200', 'http://localhost:8081']
      : [
          'https://lastmilegig.aagais.co.za',
          'https://ops.lastmilegig.aagais.co.za',
          'https://admin.lastmilegig.aagais.co.za',
          'https://command.lastmilegig.aagais.co.za',
        ],
  };
});

/**
 * Validate required configuration at startup.
 * Fails fast if critical environment variables are missing.
 */
export function validateAuthConfig(config: AuthConfiguration): string[] {
  const errors: string[] = [];

  if (!config.auth0.domain) {
    errors.push('LMG_AUTH0_DOMAIN is required');
  }
  if (!config.auth0.audience) {
    errors.push('LMG_AUTH0_AUDIENCE is required');
  }
  if (config.environment === 'production') {
    if (!config.auth0.clientId) {
      errors.push('LMG_AUTH0_CLIENT_ID is required in production');
    }
    if (!config.auth0.clientSecret) {
      errors.push('LMG_AUTH0_CLIENT_SECRET is required in production');
    }
    if (!config.supabase.serviceRoleKey) {
      errors.push('LMG_SUPABASE_SERVICE_ROLE_KEY is required in production');
    }
    if (!config.redis.url || config.redis.url === 'redis://localhost:6379') {
      errors.push('LMG_UPSTASH_REDIS_URL must be configured for production');
    }
  }

  return errors;
}

/**
 * Session configuration constants.
 * Absolute session timeout per docs/specs/10_SECURITY_COMPLIANCE.md Section 2.1.
 */
export const SESSION_CONSTANTS = {
  /** Ops/admin session timeout: 8 hours */
  OPS_SESSION_TIMEOUT_SECONDS: 8 * 60 * 60,
  /** Customer session timeout with "remember me": 30 days */
  CUSTOMER_REMEMBER_TIMEOUT_SECONDS: 30 * 24 * 60 * 60,
  /** Default session timeout: 24 hours */
  DEFAULT_SESSION_TIMEOUT_SECONDS: 24 * 60 * 60,
  /** Brute force lockout: 10 failed attempts */
  MAX_LOGIN_ATTEMPTS: 10,
  /** Lockout duration: 24 hours */
  LOCKOUT_DURATION_SECONDS: 24 * 60 * 60,
  /** Refresh token rotation: old token invalidated on use */
  REFRESH_TOKEN_ROTATION: true,
  /** Token blacklist TTL matches refresh token expiry */
  TOKEN_BLACKLIST_TTL_SECONDS: 7 * 24 * 60 * 60,
} as const;
