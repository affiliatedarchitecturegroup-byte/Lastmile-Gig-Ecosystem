/**
 * API Gateway - Root Module (Phase E Implementation)
 *
 * Configures routing, middleware pipeline, global guards,
 * OpenAPI documentation, and request interceptors.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.1
 */

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { gatewayConfig } from './config/gateway.config';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';
import { JwtMiddleware } from './middleware/jwt.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [gatewayConfig],
    }),
    HealthModule,
    ProxyModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Configure middleware pipeline.
   * Order matters: rate limiting -> JWT validation -> route handling.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');

    consumer
      .apply(JwtMiddleware)
      .forRoutes('*');
  }
}
