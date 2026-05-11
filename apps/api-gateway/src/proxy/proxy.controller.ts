/**
 * Proxy Controller - Service Route Configuration (Phase E Implementation)
 *
 * Routes external API requests to internal microservices.
 * All routes declared with upstream service targets.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.1
 * @see docs/specs/12_API_INTEGRATION_SPEC.md
 * @module proxy/proxy.controller
 */

import { Controller, All, Req, Res, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import type { GatewayConfiguration, ServiceRoute } from '../config/gateway.config';

@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);
  private readonly routeMap = new Map<string, ServiceRoute>();

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<GatewayConfiguration>('gateway');
    if (config) {
      for (const route of config.serviceRoutes) {
        this.routeMap.set(route.prefix, route);
      }
      this.logger.log(`Registered ${this.routeMap.size} service routes`);
    }
  }

  /**
   * GET /v1/services
   * Returns the service registry for documentation and health monitoring.
   */
  @All('services')
  getServiceRegistry(): {
    services: Array<{ prefix: string; description: string; requiresAuth: boolean }>;
    totalRoutes: number;
    version: string;
  } {
    const services: Array<{ prefix: string; description: string; requiresAuth: boolean }> = [];
    for (const [, route] of this.routeMap) {
      services.push({
        prefix: `/v1${route.prefix}`,
        description: route.description,
        requiresAuth: route.requiresAuth,
      });
    }

    return {
      services,
      totalRoutes: services.length,
      version: '1.0.0',
    };
  }

  /**
   * Catch-all proxy handler.
   * Forwards requests to the appropriate upstream service based on path prefix.
   *
   * In production, this uses http-proxy-middleware or a similar reverse proxy.
   * For development, it returns routing information.
   */
  @All('*path')
  async proxyRequest(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const path = req.path;
    const matchedRoute = this.findRoute(path);

    if (!matchedRoute) {
      res.status(HttpStatus.NOT_FOUND).json({
        type: 'https://api.lastmilegig.aagais.co.za/errors/route-not-found',
        title: 'Route Not Found',
        status: 404,
        detail: `No service registered for path: ${path}`,
      });
      return;
    }

    // In production, proxy to upstream service
    // For development, return routing info
    const targetUrl = `${matchedRoute.target}:${matchedRoute.port}${path}`;

    this.logger.debug(`Routing ${req.method} ${path} -> ${targetUrl}`);

    // Development mode: return routing information
    res.status(HttpStatus.OK).json({
      routed: true,
      method: req.method,
      path,
      upstream: {
        service: matchedRoute.prefix.replace('/', ''),
        target: targetUrl,
        requiresAuth: matchedRoute.requiresAuth,
      },
      headers: {
        'x-user-id': req.headers['x-user-id'] ?? null,
        'x-user-role': req.headers['x-user-role'] ?? null,
        'x-request-id': req.headers['x-request-id'] ?? null,
      },
    });
  }

  /**
   * Finds the matching service route for a given path.
   */
  private findRoute(path: string): ServiceRoute | null {
    // Remove /v1 prefix for matching
    const normalizedPath = path.replace(/^\/v1/, '');

    for (const [prefix, route] of this.routeMap) {
      if (normalizedPath.startsWith(prefix)) {
        return route;
      }
    }

    return null;
  }
}
