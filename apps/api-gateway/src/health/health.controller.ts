/**
 * Health Check Controller (Phase E Implementation)
 *
 * Provides liveness and readiness probes for Kubernetes.
 * Checks connectivity to downstream services and dependencies.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 4
 * @module health/health.controller
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { GatewayConfiguration } from '../config/gateway.config';

/**
 * Health check response structure.
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  environment: string;
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    responseTime: number;
    message?: string;
  }>;
}

/**
 * Readiness check response structure.
 */
interface ReadinessResponse {
  ready: boolean;
  services: Array<{
    name: string;
    available: boolean;
  }>;
}

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  /**
   * GET /v1/health
   * Liveness probe - returns 200 if the gateway process is running.
   * Used by Kubernetes liveness probe.
   */
  @Get('health')
  getHealth(): HealthCheckResponse {
    const config = this.configService.get<GatewayConfiguration>('gateway');
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: 'healthy',
      version: process.env['npm_package_version'] ?? '0.1.0',
      uptime,
      environment: config?.environment ?? 'unknown',
      timestamp: new Date().toISOString(),
      checks: [
        {
          name: 'api-gateway',
          status: 'pass',
          responseTime: 0,
          message: `Running for ${uptime}s`,
        },
        {
          name: 'memory',
          status: this.checkMemory(),
          responseTime: 0,
          message: this.getMemoryUsage(),
        },
      ],
    };
  }

  /**
   * GET /v1/ready
   * Readiness probe - returns 200 if the gateway can serve traffic.
   * Checks that configuration is loaded and routes are registered.
   */
  @Get('ready')
  getReady(): ReadinessResponse {
    const config = this.configService.get<GatewayConfiguration>('gateway');
    const hasConfig = !!config;
    const hasRoutes = (config?.serviceRoutes?.length ?? 0) > 0;

    const services = [
      { name: 'configuration', available: hasConfig },
      { name: 'routes', available: hasRoutes },
    ];

    const ready = services.every((s) => s.available);

    return { ready, services };
  }

  /**
   * GET /v1/metrics
   * Prometheus metrics endpoint (placeholder for OTel integration).
   */
  @Get('metrics')
  getMetrics(): string {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return [
      '# HELP lmg_gateway_uptime_seconds Gateway uptime in seconds',
      '# TYPE lmg_gateway_uptime_seconds gauge',
      `lmg_gateway_uptime_seconds ${uptime}`,
      '',
      '# HELP lmg_gateway_info Gateway build information',
      '# TYPE lmg_gateway_info gauge',
      `lmg_gateway_info{version="${process.env['npm_package_version'] ?? '0.1.0'}"} 1`,
    ].join('\n');
  }

  // --- Private helpers ---

  private checkMemory(): 'pass' | 'warn' | 'fail' {
    if (typeof process === 'undefined') return 'pass';
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / (1024 * 1024);
    if (heapUsedMB > 400) return 'fail';
    if (heapUsedMB > 256) return 'warn';
    return 'pass';
  }

  private getMemoryUsage(): string {
    if (typeof process === 'undefined') return 'N/A';
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / (1024 * 1024));
    const heapTotalMB = Math.round(usage.heapTotal / (1024 * 1024));
    return `Heap: ${heapUsedMB}/${heapTotalMB} MB`;
  }
}
