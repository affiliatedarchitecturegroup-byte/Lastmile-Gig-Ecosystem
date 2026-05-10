/**
 * API Gateway - Entry Point
 *
 * Single entry point for all external traffic. Routes to downstream
 * services, enforces auth, rate limiting, and API key validation.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.1
 * @port 3000
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('APIGateway');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('v1');

  // CORS configuration
  app.enableCors({
    origin: [
      'https://lastmilegig.aagais.co.za',
      'https://ops.lastmilegig.aagais.co.za',
      'https://admin.lastmilegig.aagais.co.za',
      'https://command.lastmilegig.aagais.co.za',
      ...(process.env.LMG_ENVIRONMENT === 'development'
        ? ['http://localhost:3000', 'http://localhost:4200']
        : []),
    ],
    credentials: true,
  });

  // Global validation pipe
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.LMG_PORT_API_GATEWAY ?? 3000;
  await app.listen(port);
  logger.log(`API Gateway running on port ${port}`);
}

void bootstrap();
