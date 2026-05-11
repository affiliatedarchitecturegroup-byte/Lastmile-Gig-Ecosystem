/**
 * Auth Controller Unit Tests
 *
 * Tests endpoint routing, input validation, and response formatting.
 * Coverage target: 85%+ per DEVELOPMENT_DIRECTIVES.md Section 4.1.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.2
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { ApiKeyService } from '../services/api-key.service';
import { RegisterableRole } from '../dto/auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let apiKeyService: ApiKeyService;

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({
      userId: 'user-uuid-123',
      email: 'test@example.com',
      role: 'customer',
      tokens: {
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      },
    }),
    login: jest.fn().mockResolvedValue({
      userId: 'user-uuid-123',
      email: 'test@example.com',
      role: 'customer',
      emailVerified: true,
      tokens: {
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      },
    }),
    refreshToken: jest.fn().mockResolvedValue({
      accessToken: 'jwt-access-token-new',
      refreshToken: 'jwt-refresh-token-new',
      tokenType: 'Bearer',
      expiresIn: 900,
    }),
    logout: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue({
      userId: 'user-uuid-123',
      email: 'test@example.com',
      role: 'customer',
      displayName: 'Test User',
      avatarUrl: null,
      emailVerified: true,
      popiaConsent: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
    forgotPassword: jest.fn().mockResolvedValue(undefined),
    changePassword: jest.fn().mockResolvedValue(undefined),
  };

  const mockApiKeyService = {
    createApiKey: jest.fn().mockResolvedValue({
      id: 'key-uuid-123',
      name: 'Test Key',
      key: 'lmg_test-key-plaintext',
      prefix: 'lmg_test',
      scopes: ['read:restaurants'],
      expiresAt: null,
    }),
    listApiKeys: jest.fn().mockResolvedValue([
      {
        id: 'key-uuid-123',
        name: 'Test Key',
        prefix: 'lmg_test',
        scopes: ['read:restaurants'],
        active: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
    updateApiKey: jest.fn().mockResolvedValue({ id: 'key-uuid-123', name: 'Updated', active: true }),
    revokeApiKey: jest.fn().mockResolvedValue(undefined),
  };

  const mockRequest = {
    user: { userId: 'user-uuid-123', role: 'developer', email: 'test@example.com', permissions: [] },
    ip: '127.0.0.1',
    headers: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ApiKeyService, useValue: mockApiKeyService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    apiKeyService = module.get<ApiKeyService>(ApiKeyService);

    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should return 201 with user data and tokens', async () => {
      const dto = {
        email: 'newuser@example.com',
        password: 'SecureP@ss1!',
        role: RegisterableRole.CUSTOMER,
        popiaConsent: true,
      };

      const result = await controller.register(dto, mockRequest as never, 'test-agent');

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe('user-uuid-123');
      expect(result.data.tokens.accessToken).toBe('jwt-access-token');
      expect(authService.register).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
    });
  });

  describe('POST /auth/login', () => {
    it('should return 200 with user data and tokens', async () => {
      const dto = { email: 'test@example.com', password: 'SecureP@ss1!' };

      const result = await controller.login(dto, mockRequest as never, 'test-agent');

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe('user-uuid-123');
      expect(result.data.emailVerified).toBe(true);
      expect(authService.login).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens', async () => {
      const dto = { refreshToken: 'old-refresh-token' };

      const result = await controller.refresh(dto, mockRequest as never, 'test-agent');

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('jwt-access-token-new');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile', async () => {
      const result = await controller.getProfile(mockRequest as never);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe('user-uuid-123');
      expect(result.data.displayName).toBe('Test User');
    });
  });

  describe('POST /auth/logout', () => {
    it('should return success message', async () => {
      const dto = { accessToken: 'access-token', refreshToken: 'refresh-token' };

      const result = await controller.logout(dto, mockRequest as never, 'test-agent');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully logged out.');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should return success regardless of email existence', async () => {
      const dto = { email: 'any@example.com' };

      const result = await controller.forgotPassword(dto, mockRequest as never, 'test-agent');

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset email');
    });
  });

  describe('POST /auth/api-keys', () => {
    it('should create a new API key', async () => {
      const dto = { name: 'Test Key', scopes: ['read:restaurants'] };

      const result = await controller.createApiKey(dto, mockRequest as never);

      expect(result.success).toBe(true);
      expect(result.data.key).toContain('lmg_');
      expect(result.data.message).toContain('Store this key securely');
    });
  });

  describe('GET /auth/api-keys', () => {
    it('should list user API keys', async () => {
      const result = await controller.listApiKeys(mockRequest as never);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Test Key');
    });
  });

  describe('DELETE /auth/api-keys/:id', () => {
    it('should revoke an API key', async () => {
      const result = await controller.revokeApiKey('key-uuid-123', mockRequest as never, 'test-agent');

      expect(result.success).toBe(true);
      expect(result.message).toBe('API key revoked.');
    });
  });
});
