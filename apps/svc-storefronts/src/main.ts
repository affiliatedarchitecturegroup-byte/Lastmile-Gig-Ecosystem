/**
 * Storefront Service - Entry Point
 *
 * Restaurant/partner profile management, menu CRUD (synced from Sanity CMS),
 * order intake from storefront pages, per-partner analytics.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.11
 * @port 3005
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { StorefrontModule } from './storefront.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('StorefrontService');
  const app = await NestFactory.create(StorefrontModule);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: [
      'https://lastmilegig.aagais.co.za',
      'https://ops.lastmilegig.aagais.co.za',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  const port = process.env['LMG_PORT_STOREFRONT_SERVICE'] ?? 3005;
  await app.listen(port);
  logger.log(`Storefront Service running on port ${port}`);
}

void bootstrap();
