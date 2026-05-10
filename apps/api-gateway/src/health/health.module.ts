/**
 * Health Check Module
 *
 * Provides /health and /ready endpoints for Kubernetes probes.
 */

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
