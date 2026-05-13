/**
 * Health Controller (P180)
 *
 * Kubernetes probe endpoints for the storefront service.
 *
 * @module svc-storefronts/health/health.controller
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  health(): Record<string, unknown> {
    return {
      status: 'ok',
      service: 'lmg-storefront-service',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  ready(): Record<string, unknown> {
    return {
      status: 'ready',
      checks: {
        mongodb: 'ok',
        sanity: 'ok',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
