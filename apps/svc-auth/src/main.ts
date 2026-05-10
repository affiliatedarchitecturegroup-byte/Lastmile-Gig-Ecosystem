/**
 * Auth Service - Entry Point
 *
 * OAuth2/SSO coordination with Auth0, JWT management,
 * RBAC enforcement, API key provisioning, biometric session management.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.2
 * @see docs/specs/10_SECURITY_COMPLIANCE.md
 * @port 3001
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AuthModule } from './auth.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('AuthService');
  const app = await NestFactory.create(AuthModule);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.LMG_PORT_AUTH_SERVICE ?? 3001;
  await app.listen(port);
  logger.log(`Auth Service running on port ${port}`);
}

void bootstrap();
