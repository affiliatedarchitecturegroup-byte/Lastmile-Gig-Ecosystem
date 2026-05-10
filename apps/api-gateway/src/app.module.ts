/**
 * API Gateway - Root Module
 *
 * Configures routing, middleware, and global guards for the gateway.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    HealthModule,
    ProxyModule,
  ],
})
export class AppModule {}
