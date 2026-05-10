/**
 * Health Check Controller
 *
 * Provides liveness and readiness probes for Kubernetes.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 4
 */

import { Controller, Get } from '@nestjs/common';
import type { HealthCheckResponse } from '@lastmile-gig/shared-types';

@Controller()
export class HealthController {
  private readonly startTime = Date.now();

  @Get('health')
  getHealth(): HealthCheckResponse {
    return {
      status: 'healthy',
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: [
        {
          name: 'api-gateway',
          status: 'pass',
          responseTime: 0,
        },
      ],
    };
  }

  @Get('ready')
  getReady(): { ready: boolean } {
    return { ready: true };
  }
}
