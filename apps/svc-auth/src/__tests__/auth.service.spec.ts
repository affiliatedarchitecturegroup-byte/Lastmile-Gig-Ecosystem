/**
 * Auth Service Unit Tests
 *
 * Tests registration, login, logout, token refresh, and password management.
 * Coverage target: 85%+ per DEVELOPMENT_DIRECTIVES.md Section 4.1.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from '../auth.service';
import { Auth0Service } from '../services/auth0.service';
import { SupabaseService } from '../services/supabase.service';
import { TokenService } from '../services/token.service';
import { RedisService } from '../services/redis.service';
import { AuditService } from '../services/audit.service';
import { RegisterableRole } from '../dto/auth.dto';

describe('AuthService', () => {
  let service: AuthService;
  let auth0Service: Auth0Service;
  let supabaseService: SupabaseService;
  let tokenService: TokenService;
  let redisService: RedisService;
  let auditService: AuditService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      auth0: {
        domain: 'dev-lastmilegig.us.auth0.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        audience: 'https://api.lastmilegig.aagais.co.za',
        issuerBaseUrl: 'https://dev-lastmilegig.us.auth0.com/',
      },
      jwt: {
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        issuer: 'https://dev-lastmilegig.us.auth0.com/',
        algorithm: 'RS256',
      },
      redis: { url: 'redis://localhost:6379', token: '', keyPrefix: 'lmg:auth:' },
      supabase: { url: 'http://localhost:54321', anonKey: '', serviceRoleKey: '' },
      environment: 'development',
      port: 3001,
      corsOrigins: ['http://localhost:3000'],
    }),
  };

  const mockAuth0Service = {
    createUser: jest.fn().mockResolvedValue('auth0|test-user-123'),
    authenticateUser: jest.fn().mockResolvedValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      token_type: 'Bearer',
      expires_in: 900,
      scope: 'openid profile email',
    }),
    requestPasswordReset: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
  };

  const mockSupabaseService = {
    createUser: jest.fn().mockResolvedValue({
      id: 'user-uuid-123',
      email: 'test@example.com',
      phone: null,
      role: 'customer',
      auth0_id: null,
      display_name: null,
      avatar_url: null,
      popia_consent: true,
      popia_consent_at: new Date().toISOString(),
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }),
    findUserByEmail: jest.fn().mockResolvedValue(null),
    findUserById: jest.fn().mockResolvedValue({
      id: 'user-uuid-123',
      email: 'test@example.com',
      phone: null,
      role: 'customer',
      auth0_id: 'auth0|test-user-123',
      display_name: 'Test User',
      avatar_url: null,
      popia_consent: true,
      popia_consent_at: new Date().toISOString(),
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }),
    updateUser: jest.fn().mockResolvedValue({}),
  };

  const mockTokenService = {
    generateTokenPair: jest.fn().mockResolvedValue({
      accessToken: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      scope: 'openid profile email',
    }),
    rotateRefreshToken: jest.fn().mockResolvedValue({
      accessToken: 'jwt-access-token-new',
      refreshToken: 'jwt-refresh-token-new',
      tokenType: 'Bearer',
      expiresIn: 900,
      scope: 'openid profile email',
    }),
    blacklistAccessToken: jest.fn().mockResolvedValue(undefined),
  };

  const mockRedisService = {
    isAccountLocked: jest.fn().mockResolvedValue(false),
    recordLoginAttempt: jest.fn().mockResolvedValue({ attempts: 1, locked: false }),
    clearLoginAttempts: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue('audit-entry-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Auth0Service, useValue: mockAuth0Service },
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    auth0Service = module.get<Auth0Service>(Auth0Service);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    tokenService = module.get<TokenService>(TokenService);
    redisService = module.get<RedisService>(RedisService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecureP@ss1!',
      role: RegisterableRole.CUSTOMER,
      popiaConsent: true,
    };

    it('should register a new user successfully', async () => {
      const result = await service.register(registerDto, '127.0.0.1', 'test-agent');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-uuid-123');
      expect(result.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('jwt-access-token');
      expect(supabaseService.createUser).toHaveBeenCalledTimes(1);
      expect(auth0Service.createUser).toHaveBeenCalledTimes(1);
      expect(tokenService.generateTokenPair).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledTimes(1);
    });

    it('should reject registration without POPIA consent', async () => {
      const noConsentDto = { ...registerDto, popiaConsent: false };

      await expect(
        service.register(noConsentDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject registration with existing email', async () => {
      mockSupabaseService.findUserByEmail.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'newuser@example.com',
      });

      await expect(
        service.register(registerDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'existing@example.com',
      password: 'SecureP@ss1!',
    };

    it('should login successfully with valid credentials', async () => {
      mockSupabaseService.findUserByEmail.mockResolvedValueOnce({
        id: 'user-uuid-123',
        email: 'existing@example.com',
        role: 'customer',
        auth0_id: 'auth0|test-user-123',
        email_verified: true,
      });

      const result = await service.login(loginDto, '127.0.0.1', 'test-agent');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-uuid-123');
      expect(result.tokens.accessToken).toBe('jwt-access-token');
      expect(redisService.clearLoginAttempts).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledTimes(1);
    });

    it('should reject login for non-existent user', async () => {
      mockSupabaseService.findUserByEmail.mockResolvedValueOnce(null);

      await expect(
        service.login(loginDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);

      expect(redisService.recordLoginAttempt).toHaveBeenCalledTimes(1);
    });

    it('should reject login when account is locked', async () => {
      mockRedisService.isAccountLocked.mockResolvedValueOnce(true);

      await expect(
        service.login(loginDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should record failed login attempt on wrong password', async () => {
      mockSupabaseService.findUserByEmail.mockResolvedValueOnce({
        id: 'user-uuid-123',
        email: 'existing@example.com',
      });
      mockAuth0Service.authenticateUser.mockRejectedValueOnce(new Error('Invalid password'));

      await expect(
        service.login(loginDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);

      expect(redisService.recordLoginAttempt).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshToken', () => {
    it('should rotate refresh token successfully', async () => {
      const result = await service.refreshToken('old-refresh-token', '127.0.0.1', 'test-agent');

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('jwt-access-token-new');
      expect(result.refreshToken).toBe('jwt-refresh-token-new');
      expect(tokenService.rotateRefreshToken).toHaveBeenCalledWith(
        'old-refresh-token',
        '127.0.0.1',
        'test-agent',
      );
    });
  });

  describe('logout', () => {
    it('should blacklist tokens and log the event', async () => {
      await service.logout('access-token', 'refresh-token', 'user-123', '127.0.0.1', 'test-agent');

      expect(tokenService.blacklistAccessToken).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const profile = await service.getProfile('user-uuid-123');

      expect(profile).toBeDefined();
      expect(profile.userId).toBe('user-uuid-123');
      expect(profile.email).toBe('test@example.com');
      expect(profile.role).toBe('customer');
      expect(profile.displayName).toBe('Test User');
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset for existing user', async () => {
      mockSupabaseService.findUserByEmail.mockResolvedValueOnce({
        id: 'user-uuid-123',
        email: 'test@example.com',
      });

      await service.forgotPassword('test@example.com', '127.0.0.1', 'test-agent');

      expect(auth0Service.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(auditService.log).toHaveBeenCalledTimes(1);
    });

    it('should not throw for non-existent email (prevents enumeration)', async () => {
      mockSupabaseService.findUserByEmail.mockResolvedValueOnce(null);

      await expect(
        service.forgotPassword('nonexistent@example.com', '127.0.0.1', 'test-agent'),
      ).resolves.not.toThrow();
    });
  });
});
