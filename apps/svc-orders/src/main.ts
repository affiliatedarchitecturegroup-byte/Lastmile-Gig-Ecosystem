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
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = process.env.LMG_PORT_ORDER_SERVICE ?? 3003;
  await app.listen(port);
  logger.log(`Order Service running on port ${port}`);
}

void bootstrap();
