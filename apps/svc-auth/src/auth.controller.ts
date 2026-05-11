/**
 * Auth Controller - Full Phase E Implementation
 *
 * Handles all authentication endpoints: register, login, logout, refresh,
 * password management, profile, API key management, and health checks.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.2
 * @see docs/specs/10_SECURITY_COMPLIANCE.md
 * @module auth.controller
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { ApiKeyService } from './services/api-key.service';
import { Public } from './guards/jwt-auth.guard';
import { Roles } from './guards/roles.guard';
import type { ValidatedUser } from './strategies/jwt.strategy';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
  ForgotPasswordDto,
  ChangePasswordDto,
  CreateApiKeyDto,
  UpdateApiKeyDto,
} from './dto/auth.dto';

/**
 * Extended Express Request with authenticated user.
 */
interface AuthenticatedRequest {
  user: ValidatedUser;
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  // --- Public Endpoints (no auth required) ---

  /**
   * POST /v1/auth/register
   * Creates a new user account.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: AuthenticatedRequest,
    @Headers('user-agent') userAgent: string,
  ): Promise<{
    success: boolean;
    data: { userId: string; email: string; role: string; tokens: { accessToken: string; refreshToken: string; tokenType: string; expiresIn: number } };
  }> {
    const result = await this.authService.register(dto, req.ip, userAgent ?? 'unknown');
    return {
      success: true,
      data: {
        userId: result.userId,
        email: result.email,
        role: result.role,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          tokenType: result.tokens.tokenType,
          expiresIn: result.tokens.expiresIn,
        },
      },
    };
  }

  /**
   * POST /v1/auth/login
   * Authenticates a user and returns JWT tokens.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Headers('user-agent') userAgent: string,
  ): Promise<{
    success: boolean;
    data: { userId: string; email: string; role: string; emailVerified: boolean; tokens: { accessToken: string; refreshToken: string; tokenType: string; expiresIn: number } };
  }> {
    const result = await this.authService.login(dto, req.ip, userAgent ?? 'unknown');
    return {
      success: true,
      data: {
        userId: result.userId,
        email: result.email,
        role: result.role,
        emailVerified: result.emailVerified,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          tokenType: result.tokens.tokenType,
          expiresIn: result.tokens.expiresIn,
        },
      },
    };
  }

  /**
   * POST /v1/auth/refresh
   * Exchanges a refresh token for new tokens (rotation).
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: AuthenticatedRequest,
    @Headers('user-agent') userAgent: string,
  ): Promise<{
    success: boolean;
    data: { accessToken: string; refreshToken: string; tokenType: string; expiresIn: number };
  }> {
    const tokens = await this.authService.refreshToken(
      dto.refreshToken,
      req.ip,
      userAgent ?? 'unknown',
    );
    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      },
    };
  }

  /**
   * POST /v1/auth/forgot-password
   * Initiates password reset email.
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: AuthenticatedRequest,
    @Headers('user-agent') userAgent: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.forgotPassword(dto.email, req.ip, userAgent ?? 'unknown');
    return {
      success: true,
      message: 'If an account with that email exists, a password reset email has been sent.',
    };
  }

  // --- Protected Endpoints (auth required) ---

  /**
   * GET /v1/auth/me
   * Returns the profile of the authenticated user.
   */
  @Get('me')
  async getProfile(
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    data: { userId: string; email: string; role: string; displayName: string | null; avatarUrl: string | null; emailVerified: boolean; popiaConsent: boolean; createdAt: string };
  }> {
    const profile = await this.authService.getProfile(req.user.userId);
    return { success: true, data: profile };
  }

  /**
   * POST /v1/auth/logout
   * Logs out the current session.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: AuthenticatedRequest,
    @Headers('user-agent') userAgent: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.logout(
      dto.accessToken,
      dto.refreshToken,
      req.user.userId,
      req.ip,
      userAgent ?? 'unknown',
    );
    return { success: true, message: 'Successfully logged out.' };
  }

  /**
   * POST /v1/auth/change-password
   * Changes the password of the authenticated user.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
    @Headers('user-agent') userAgent: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
      req.ip,
      userAgent ?? 'unknown',
    );
    return { success: true, message: 'Password changed successfully.' };
  }

  // --- API Key Management (Developer Portal) ---

  /**
   * POST /v1/auth/api-keys
   * Generates a new API key.
   */
  @Roles('developer', 'admin', 'super_admin')
  @Post('api-keys')
  @HttpCode(HttpStatus.CREATED)
  async createApiKey(
    @Body() dto: CreateApiKeyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    data: { id: string; name: string; key: string; prefix: string; scopes: string[]; expiresAt: string | null; message: string };
  }> {
    const result = await this.apiKeyService.createApiKey(
      req.user.userId,
      dto.name,
      dto.description,
      dto.scopes,
      dto.expiresAt,
    );
    return {
      success: true,
      data: {
        ...result,
        message: 'Store this key securely. It will not be shown again.',
      },
    };
  }

  /**
   * GET /v1/auth/api-keys
   * Lists all API keys for the authenticated user.
   */
  @Roles('developer', 'admin', 'super_admin')
  @Get('api-keys')
  async listApiKeys(
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    data: Array<{ id: string; name: string; prefix: string; scopes: string[]; active: boolean; lastUsedAt: string | null; expiresAt: string | null; createdAt: string }>;
  }> {
    const keys = await this.apiKeyService.listApiKeys(req.user.userId);
    return { success: true, data: keys };
  }

  /**
   * PATCH /v1/auth/api-keys/:id
   * Updates an API key.
   */
  @Roles('developer', 'admin', 'super_admin')
  @Patch('api-keys/:id')
  async updateApiKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApiKeyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; data: { id: string; name: string; active: boolean } | null }> {
    const result = await this.apiKeyService.updateApiKey(id, req.user.userId, dto);
    return { success: true, data: result };
  }

  /**
   * DELETE /v1/auth/api-keys/:id
   * Revokes an API key.
   */
  @Roles('developer', 'admin', 'super_admin')
  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Headers('user-agent') userAgent: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.apiKeyService.revokeApiKey(id, req.user.userId, req.ip, userAgent ?? 'unknown');
    return { success: true, message: 'API key revoked.' };
  }

  // --- Admin Endpoints ---

  /**
   * GET /v1/auth/admin/users/:id
   * Gets user details (admin only).
   */
  @Roles('admin', 'super_admin')
  @Get('admin/users/:id')
  async getUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    success: boolean;
    data: { userId: string; email: string; role: string; displayName: string | null; avatarUrl: string | null; emailVerified: boolean; popiaConsent: boolean; createdAt: string };
  }> {
    const profile = await this.authService.getProfile(id);
    return { success: true, data: profile };
  }
}
