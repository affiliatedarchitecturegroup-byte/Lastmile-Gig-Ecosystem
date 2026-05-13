/**
 * Storefront Service - NestJS Entry Point (P180)
 *
 * Bootstraps the NestJS application for the Restaurant Storefronts
 * microservice. Configures Swagger docs, CORS, validation pipes,
 * and OpenTelemetry instrumentation.
 *
 * Port: 3005 (per POLYGLOT_ARCHITECTURE.md)
 *
 * @module svc-storefronts/main
 * @language TypeScript (NestJS)
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { StorefrontModule } from './storefront.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('StorefrontService');
  const app = await NestFactory.create(StorefrontModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Global prefix
  app.setGlobalPrefix('v1');

  // Validation pipe (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  app.enableCors({
    origin: [
      'https://lastmilegig.aagais.co.za',
      'https://ops.lastmilegig.aagais.co.za',
      'https://admin.lastmilegig.aagais.co.za',
      /\.lastmilegig\.aagais\.co\.za$/,
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Swagger / OpenAPI 3.1
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lastmile Gig - Storefront Service')
    .setDescription(
      'Restaurant storefront management API. Handles restaurants, menus, ' +
      'orders, and partner analytics for the Lastmile Gig platform.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('restaurants', 'Restaurant CRUD operations')
    .addTag('menus', 'Menu and menu item management')
    .addTag('orders', 'Storefront order placement')
    .addTag('analytics', 'Partner analytics dashboard')
    .addTag('webhooks', 'Sanity CMS webhook handlers')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env['LMG_STOREFRONT_PORT'] || 3005;
  await app.listen(port);

  logger.log(`Storefront Service running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
