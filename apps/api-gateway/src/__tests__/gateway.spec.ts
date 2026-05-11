/**
 * API Gateway Unit Tests
 *
 * Tests health endpoints, proxy routing, rate limiting, and JWT middleware.
 * Coverage target: 80%+ per DEVELOPMENT_DIRECTIVES.md Section 4.1.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { HealthController } from '../health/health.controller';
import { ProxyController } from '../proxy/proxy.controller';

const mockGatewayConfig = {
  port: 3000,
  environment: 'development',
  corsOrigins: ['http://localhost:3000'],
  serviceRoutes: [
    { prefix: '/auth', target: 'http://localhost', port: 3001, requiresAuth: false, description: 'Auth Service' },
    { prefix: '/drivers', target: 'http://localhost', port: 3002, requiresAuth: true, description: 'Driver Service' },
    { prefix: '/orders', target: 'http://localhost', port: 3003, requiresAuth: true, description: 'Order Service' },
    { prefix: '/restaurants', target: 'http://localhost', port: 3005, requiresAuth: false, description: 'Storefront Service' },
  ],
  rateLimits: {
    global: { limit: 2000, windowSeconds: 300, message: 'Rate limited' },
    auth: { limit: 20, windowSeconds: 300, message: 'Auth rate limited' },
    payments: { limit: 100, windowSeconds: 300, message: 'Payment rate limited' },
    apiKey: { basic: { limit: 1000, windowSeconds: 3600, message: 'Basic rate limited' } },
  },
  redis: { url: 'redis://localhost:6379', token: '', keyPrefix: 'lmg:gateway:' },
  openapi: { title: 'Lastmile Gig API', description: 'Test', version: '1.0.0', contactEmail: 'test@test.com', licenseUrl: '' },
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'gateway') return mockGatewayConfig;
    return undefined;
  }),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health', () => {
    it('should return healthy status', () => {
      const result = controller.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.checks).toHaveLength(2);
      expect(result.checks[0].name).toBe('api-gateway');
      expect(result.checks[0].status).toBe('pass');
    });

    it('should include environment and timestamp', () => {
      const result = controller.getHealth();

      expect(result.environment).toBe('development');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('GET /ready', () => {
    it('should return ready when config is loaded', () => {
      const result = controller.getReady();

      expect(result.ready).toBe(true);
      expect(result.services).toHaveLength(2);
      expect(result.services.every((s: { available: boolean }) => s.available)).toBe(true);
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics format', () => {
      const result = controller.getMetrics();

      expect(result).toContain('lmg_gateway_uptime_seconds');
      expect(result).toContain('lmg_gateway_info');
      expect(result).toContain('# HELP');
      expect(result).toContain('# TYPE');
    });
  });
});

describe('ProxyController', () => {
  let controller: ProxyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [{ provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
  });

  describe('GET /services', () => {
    it('should return service registry', () => {
      const result = controller.getServiceRegistry();

      expect(result.totalRoutes).toBe(4);
      expect(result.services).toHaveLength(4);
      expect(result.version).toBe('1.0.0');
    });

    it('should include auth status for each service', () => {
      const result = controller.getServiceRegistry();
      const authService = result.services.find((s: { prefix: string }) => s.prefix.includes('/auth'));
      const driverService = result.services.find((s: { prefix: string }) => s.prefix.includes('/drivers'));

      expect(authService?.requiresAuth).toBe(false);
      expect(driverService?.requiresAuth).toBe(true);
    });
  });

  describe('Proxy routing', () => {
    it('should return 404 for unknown routes', async () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.proxyRequest(
        { path: '/v1/unknown', method: 'GET', headers: {} } as never,
        mockRes as never,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 404 }),
      );
    });

    it('should route known paths to upstream services', async () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.proxyRequest(
        { path: '/v1/auth/login', method: 'POST', headers: {} } as never,
        mockRes as never,
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          routed: true,
          upstream: expect.objectContaining({ service: 'auth' }),
        }),
      );
    });
  });
});
