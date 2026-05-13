/**
 * Health Module (P180)
 *
 * Provides /health and /ready endpoints for Kubernetes liveness
 * and readiness probes.
 *
 * @module svc-storefronts/health/health.module
 */

import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
