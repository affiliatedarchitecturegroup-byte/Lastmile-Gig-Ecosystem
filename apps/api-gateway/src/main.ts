/**
 * API Gateway - Entry Point (Phase E Implementation)
 *
 * Single entry point for all external traffic. Routes to downstream
 * services, enforces auth, rate limiting, CORS, and API key validation.
 * Includes OpenAPI 3.1 documentation at /v1/docs.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.1
 * @see docs/specs/12_API_INTEGRATION_SPEC.md
 * @port 3000
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('APIGateway');
  const app = await NestFactory.create(AppModule);

  // API versioning
  app.setGlobalPrefix('v1');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // CORS configuration per docs/specs/10_SECURITY_COMPLIANCE.md
  const environment = process.env['LMG_ENVIRONMENT'] ?? 'development';
  app.enableCors({
    origin: environment === 'development'
      ? ['http://localhost:3000', 'http://localhost:4200', 'http://localhost:8081']
      : [
          'https://lastmilegig.aagais.co.za',
          'https://ops.lastmilegig.aagais.co.za',
          'https://admin.lastmilegig.aagais.co.za',
          'https://command.lastmilegig.aagais.co.za',
          'https://dev.lastmilegig.aagais.co.za',
        ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Request-Id',
      'X-Trace-Id',
    ],
    exposedHeaders: [
      'X-Request-Id',
      'X-Trace-Id',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
    maxAge: 3600,
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

  // OpenAPI 3.1 documentation at /v1/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lastmile Gig API')
    .setDescription(
      'API for South Africa\'s Last-Mile Delivery Ecosystem. ' +
      'Base URL: https://api.lastmilegig.aagais.co.za/v1',
    )
    .setVersion('1.0.0')
    .setContact('Lastmile Gig API Team', 'https://dev.lastmilegig.aagais.co.za', 'api@aagais.co.za')
    .setLicense('Proprietary', 'https://lastmilegig.aagais.co.za/terms')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Auth0 JWT access token',
      },
      'JWT',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Developer Portal API key (lmg_xxx)',
      },
      'ApiKey',
    )
    .addServer('https://api.lastmilegig.aagais.co.za/v1', 'Production')
    .addServer('https://sandbox.api.lastmilegig.aagais.co.za/v1', 'Sandbox')
    .addServer('http://localhost:3000/v1', 'Local Development')
    .addTag('Auth', 'Authentication & authorization endpoints')
    .addTag('Drivers', 'Driver management endpoints')
    .addTag('Orders', 'Order lifecycle management')
    .addTag('Fleet', 'Fleet & vehicle management')
    .addTag('Restaurants', 'Restaurant storefront endpoints')
    .addTag('Payments', 'Payment processing')
    .addTag('Logistics', 'Enterprise logistics')
    .addTag('AI', 'AI & ML inference endpoints')
    .addTag('Analytics', 'Platform analytics')
    .addTag('Health', 'Service health & readiness')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Lastmile Gig API Documentation',
    customfavIcon: 'https://lastmilegig.aagais.co.za/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  // Security headers
  app.use((_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    next();
  });

  const port = process.env['LMG_PORT_API_GATEWAY'] ?? 3000;
  await app.listen(port);
  logger.log(`API Gateway running on port ${port}`);
  logger.log(`OpenAPI docs available at http://localhost:${port}/docs`);
  logger.log(`Environment: ${environment}`);
}

void bootstrap();
