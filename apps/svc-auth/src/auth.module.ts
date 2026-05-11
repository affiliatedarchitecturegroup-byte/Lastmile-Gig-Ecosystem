/**
 * Auth Module - Root Module (Phase E Implementation)
 *
 * Coordinates authentication, authorization, session management,
 * and API key provisioning. Integrates Auth0, Supabase, and Redis.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.2
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';

import { authConfig } from './config/auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { RedisService } from './services/redis.service';
import { SupabaseService } from './services/supabase.service';
import { Auth0Service } from './services/auth0.service';
import { AuditService } from './services/audit.service';
import { ApiKeyService } from './services/api-key.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [authConfig],
    }),
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Core services
    AuthService,
    TokenService,
    RedisService,
    SupabaseService,
    Auth0Service,
    AuditService,
    ApiKeyService,

    // Passport strategies
    JwtStrategy,

    // Global guards (applied to all routes)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [
    AuthService,
    TokenService,
    RedisService,
    SupabaseService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
