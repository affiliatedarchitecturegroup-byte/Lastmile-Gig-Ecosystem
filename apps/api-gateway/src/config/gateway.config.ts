/**
 * API Gateway Configuration
 *
 * Centralized configuration for service routing, rate limiting,
 * CORS origins, and OpenAPI settings.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.1
 * @see docs/specs/12_API_INTEGRATION_SPEC.md
 * @module config/gateway.config
 */

import { registerAs } from '@nestjs/config';

/**
 * Service route definition for proxy routing.
 */
export interface ServiceRoute {
  /** Route prefix (e.g., '/auth') */
  prefix: string;
  /** Target service URL */
  target: string;
  /** Target port */
  port: number;
  /** Whether the route requires authentication */
  requiresAuth: boolean;
  /** Description for OpenAPI documentation */
  description: string;
}

/**
 * Rate limiting configuration.
 */
export interface RateLimitConfig {
  /** Requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Message on rate limit exceeded */
  message: string;
}

/**
 * Gateway configuration interface.
 */
export interface GatewayConfiguration {
  port: number;
  environment: string;
  corsOrigins: string[];
  serviceRoutes: ServiceRoute[];
  rateLimits: {
    global: RateLimitConfig;
    auth: RateLimitConfig;
    payments: RateLimitConfig;
    apiKey: Record<string, RateLimitConfig>;
  };
  openapi: {
    title: string;
    description: string;
    version: string;
    contactEmail: string;
    licenseUrl: string;
  };
  redis: {
    url: string;
    token: string;
    keyPrefix: string;
  };
}

export const gatewayConfig = registerAs('gateway', (): GatewayConfiguration => {
  const environment = process.env['LMG_ENVIRONMENT'] ?? 'development';
  const baseHost = environment === 'development' ? 'http://localhost' : 'http://svc';

  return {
    port: parseInt(process.env['LMG_PORT_API_GATEWAY'] ?? '3000', 10),
    environment,
    corsOrigins: environment === 'development'
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:4200',
          'http://localhost:8081',
        ]
      : [
          'https://lastmilegig.aagais.co.za',
          'https://ops.lastmilegig.aagais.co.za',
          'https://admin.lastmilegig.aagais.co.za',
          'https://command.lastmilegig.aagais.co.za',
          'https://dev.lastmilegig.aagais.co.za',
        ],
    serviceRoutes: [
      {
        prefix: '/auth',
        target: `${baseHost}`,
        port: 3001,
        requiresAuth: false,
        description: 'Authentication & Authorization Service',
      },
      {
        prefix: '/drivers',
        target: `${baseHost}`,
        port: 3002,
        requiresAuth: true,
        description: 'Driver Management Service',
      },
      {
        prefix: '/orders',
        target: `${baseHost}`,
        port: 3003,
        requiresAuth: true,
        description: 'Order Management Service',
      },
      {
        prefix: '/fleet',
        target: `${baseHost}`,
        port: 3004,
        requiresAuth: true,
        description: 'Fleet Management Service',
      },
      {
        prefix: '/restaurants',
        target: `${baseHost}`,
        port: 3005,
        requiresAuth: false,
        description: 'Restaurant Storefront Service',
      },
      {
        prefix: '/payments',
        target: `${baseHost}`,
        port: 6000,
        requiresAuth: true,
        description: 'Payment Processing Service',
      },
      {
        prefix: '/logistics',
        target: `${baseHost}`,
        port: 6001,
        requiresAuth: true,
        description: 'Enterprise Logistics Service',
      },
      {
        prefix: '/ai',
        target: `${baseHost}`,
        port: 8000,
        requiresAuth: true,
        description: 'AI Inference Service',
      },
      {
        prefix: '/analytics',
        target: `${baseHost}`,
        port: 8002,
        requiresAuth: true,
        description: 'Analytics Service',
      },
    ],
    rateLimits: {
      global: {
        limit: 2000,
        windowSeconds: 300,
        message: 'Too many requests. Please try again later.',
      },
      auth: {
        limit: 20,
        windowSeconds: 300,
        message: 'Too many authentication attempts. Please try again later.',
      },
      payments: {
        limit: 100,
        windowSeconds: 300,
        message: 'Too many payment requests. Please try again later.',
      },
      apiKey: {
        basic: { limit: 1000, windowSeconds: 3600, message: 'API key rate limit exceeded (Basic tier).' },
        pro: { limit: 10000, windowSeconds: 3600, message: 'API key rate limit exceeded (Pro tier).' },
        enterprise: { limit: 1000000, windowSeconds: 3600, message: 'API key rate limit exceeded.' },
      },
    },
    openapi: {
      title: 'Lastmile Gig API',
      description: 'API for South Africa\'s Last-Mile Delivery Ecosystem',
      version: '1.0.0',
      contactEmail: 'api@aagais.co.za',
      licenseUrl: 'https://lastmilegig.aagais.co.za/terms',
    },
    redis: {
      url: process.env['LMG_UPSTASH_REDIS_URL'] ?? 'redis://localhost:6379',
      token: process.env['LMG_UPSTASH_REDIS_TOKEN'] ?? '',
      keyPrefix: 'lmg:gateway:',
    },
  };
});
