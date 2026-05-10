/**
 * Driver Service - Entry Point
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.3
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 * @port 3002
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DriverModule } from './driver.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('DriverService');
  const app = await NestFactory.create(DriverModule);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = process.env.LMG_PORT_DRIVER_SERVICE ?? 3002;
  await app.listen(port);
  logger.log(`Driver Service running on port ${port}`);
}

void bootstrap();
