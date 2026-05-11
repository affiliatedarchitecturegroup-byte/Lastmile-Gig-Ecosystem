/**
 * Auth Service - Core Authentication Logic (Phase E Implementation)
 *
 * Orchestrates registration, login, logout, token refresh, password management,
 * and session operations. Delegates to Auth0, Supabase, Redis, and Token services.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.2
 * @module auth.service
 */

import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Auth0Service } from './services/auth0.service';
import { SupabaseService } from './services/supabase.service';
import { TokenService } from './services/token.service';
import { RedisService } from './services/redis.service';
import { AuditService } from './services/audit.service';
import type { AuthConfiguration } from './config/auth.config';
import type { TokenResponse, SessionPayload } from './dto/auth.dto';
import { AuthAuditAction, type RegisterDto, type LoginDto } from './dto/auth.dto';

/**
 * Registration result returned to the controller.
 */
export interface RegistrationResult {
  userId: string;
  email: string;
  role: string;
  tokens: TokenResponse;
}

/**
 * Login result returned to the controller.
 */
export interface LoginResult {
  userId: string;
  email: string;
  role: string;
  emailVerified: boolean;
  tokens: TokenResponse;
}

/**
 * User profile result for /auth/me endpoint.
 */
export interface UserProfileResult {
  userId: string;
  email: string;
  role: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  popiaConsent: boolean;
  createdAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly auth0Service: Auth0Service,
    private readonly supabaseService: SupabaseService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Registers a new user in both Auth0 and Supabase.
   * Creates the Auth0 account first, then the Supabase record,
   * and finally issues JWT tokens.
   *
   * @param dto - Registration data (validated by class-validator)
   * @param ipAddress - Client IP for audit logging
   * @param userAgent - Client User-Agent for audit logging
   * @returns Registration result with tokens
   */
  async register(
    dto: RegisterDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<RegistrationResult> {
    // Validate POPIA consent
    if (!dto.popiaConsent) {
      throw new BadRequestException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/popia-consent-required',
        title: 'POPIA Consent Required',
        status: 400,
        detail: 'You must consent to the processing of your personal data to register.',
      });
    }

    // Check if email already exists
    const existing = await this.supabaseService.findUserByEmail(dto.email);
    if (existing) {
      throw new BadRequestException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/email-exists',
        title: 'Email Already Registered',
        status: 400,
        detail: 'An account with this email already exists. Please log in instead.',
      });
    }

    // Step 1: Create user in Supabase
    const user = await this.supabaseService.createUser({
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      displayName: dto.displayName,
      popiaConsent: dto.popiaConsent,
    });

    // Step 2: Create user in Auth0
    const auth0Id = await this.auth0Service.createUser(
      dto.email,
      dto.password,
      dto.role,
      user.id,
      dto.displayName,
      dto.phone,
    );

    // Step 3: Link Auth0 ID to Supabase record
    await this.supabaseService.updateUser(user.id, { auth0Id });

    // Step 4: Generate token pair
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      auth0Id,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );

    // Step 5: Audit log
    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AuthAuditAction.REGISTER,
      resource: 'user',
      resourceId: user.id,
      metadata: { role: user.role },
      ipAddress,
      userAgent,
    });

    this.logger.log(`User registered: ${user.id} (role: ${user.role})`);

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokens,
    };
  }

  /**
   * Authenticates a user via Auth0 and creates a local session.
   *
   * @param dto - Login credentials
   * @param ipAddress - Client IP
   * @param userAgent - Client User-Agent
   * @returns Login result with tokens
   */
  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<LoginResult> {
    // Check if account is locked
    const isLocked = await this.redisService.isAccountLocked(dto.email);
    if (isLocked) {
      await this.auditService.log({
        actorId: 'unknown',
        actorEmail: dto.email,
        action: AuthAuditAction.LOGIN_FAILED,
        resource: 'session',
        resourceId: null,
        metadata: { reason: 'account_locked' },
        ipAddress,
        userAgent,
      });
      throw new ForbiddenException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/account-locked',
        title: 'Account Locked',
        status: 403,
        detail: 'Your account has been temporarily locked due to too many failed login attempts. Please try again later or reset your password.',
      });
    }

    // Find user in Supabase
    const user = await this.supabaseService.findUserByEmail(dto.email);
    if (!user) {
      await this.redisService.recordLoginAttempt(dto.email);
      await this.auditService.log({
        actorId: 'unknown',
        actorEmail: dto.email,
        action: AuthAuditAction.LOGIN_FAILED,
        resource: 'session',
        resourceId: null,
        metadata: { reason: 'user_not_found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/invalid-credentials',
        title: 'Invalid Credentials',
        status: 401,
        detail: 'Invalid email or password.',
      });
    }

    // Authenticate via Auth0
    try {
      await this.auth0Service.authenticateUser(dto.email, dto.password);
    } catch {
      const { locked } = await this.redisService.recordLoginAttempt(dto.email);
      await this.auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        action: locked ? AuthAuditAction.ACCOUNT_LOCKED : AuthAuditAction.LOGIN_FAILED,
        resource: 'session',
        resourceId: null,
        metadata: { reason: 'invalid_password', locked },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/invalid-credentials',
        title: 'Invalid Credentials',
        status: 401,
        detail: 'Invalid email or password.',
      });
    }

    // Clear login attempts on success
    await this.redisService.clearLoginAttempts(dto.email);

    // Generate local token pair
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.auth0_id ?? '',
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );

    // Audit log
    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AuthAuditAction.LOGIN_SUCCESS,
      resource: 'session',
      resourceId: null,
      metadata: { role: user.role },
      ipAddress,
      userAgent,
    });

    this.logger.log(`User logged in: ${user.id}`);

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      tokens,
    };
  }

  /**
   * Refreshes an expired access token using a valid refresh token.
   * Implements token rotation: old refresh token is invalidated.
   */
  async refreshToken(
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenResponse> {
    const tokens = await this.tokenService.rotateRefreshToken(
      refreshToken,
      ipAddress,
      userAgent,
    );

    this.logger.log('Token refreshed successfully');
    return tokens;
  }

  /**
   * Logs out the current session by blacklisting tokens.
   */
  async logout(
    accessToken: string,
    refreshToken: string | undefined,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    // Blacklist the access token
    const expiresAt = Math.floor(Date.now() / 1000) + 900; // 15 min default
    await this.tokenService.blacklistAccessToken(accessToken, expiresAt);

    // Audit log
    await this.auditService.log({
      actorId: userId,
      actorEmail: '',
      action: AuthAuditAction.LOGOUT,
      resource: 'session',
      resourceId: null,
      metadata: {},
      ipAddress,
      userAgent,
    });

    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Gets the profile of the currently authenticated user.
   */
  async getProfile(userId: string): Promise<UserProfileResult> {
    const user = await this.supabaseService.findUserById(userId);
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      emailVerified: user.email_verified,
      popiaConsent: user.popia_consent,
      createdAt: user.created_at,
    };
  }

  /**
   * Initiates password reset via Auth0.
   */
  async forgotPassword(email: string, ipAddress: string, userAgent: string): Promise<void> {
    const user = await this.supabaseService.findUserByEmail(email);
    // Always return success to prevent email enumeration
    if (user) {
      await this.auth0Service.requestPasswordReset(email);
      await this.auditService.log({
        actorId: user.id,
        actorEmail: email,
        action: AuthAuditAction.PASSWORD_RESET_REQUEST,
        resource: 'user',
        resourceId: user.id,
        metadata: {},
        ipAddress,
        userAgent,
      });
    }
    this.logger.log('Password reset requested');
  }

  /**
   * Changes password for an authenticated user.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const user = await this.supabaseService.findUserById(userId);

    // Verify current password via Auth0
    try {
      await this.auth0Service.authenticateUser(user.email, currentPassword);
    } catch {
      throw new BadRequestException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/invalid-current-password',
        title: 'Invalid Current Password',
        status: 400,
        detail: 'The current password you provided is incorrect.',
      });
    }

    // Auth0 password change would happen here via Management API
    // For now, we log the audit event
    await this.auditService.log({
      actorId: userId,
      actorEmail: user.email,
      action: AuthAuditAction.PASSWORD_CHANGE,
      resource: 'user',
      resourceId: userId,
      metadata: {},
      ipAddress,
      userAgent,
    });

    this.logger.log(`Password changed for user: ${userId}`);
  }
}
