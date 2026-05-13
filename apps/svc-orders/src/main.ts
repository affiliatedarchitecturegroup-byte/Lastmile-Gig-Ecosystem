/**
 * Order Service - Entry Point
 *
 * Order placement, lifecycle management, geo-tagged delivery verification,
 * blockchain proof-of-delivery trigger.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.4
 * @port 3003
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { OrderModule } from './order.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('OrderService');
  const app = await NestFactory.create(OrderModule);

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
      'https://admin.lastmilegig.aagais.co.za',
      'https://command.lastmilegig.aagais.co.za',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Trace-ID'],
    credentials: true,
  });

  const port = process.env['LMG_PORT_ORDER_SERVICE'] ?? 3003;
  await app.listen(port);
  logger.log(`Order Service running on port ${port}`);
  logger.log(`Health check: http://localhost:${port}/v1/orders/health`);
}

void bootstrap();
