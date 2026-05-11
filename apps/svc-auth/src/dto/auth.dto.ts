/**
 * Auth Service DTOs (Data Transfer Objects)
 *
 * Validation-enforced DTOs for all auth endpoints using class-validator.
 * No `any` types permitted per CODING_STANDARDS.md Section 1.3.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 7.1
 * @module dto/auth.dto
 */

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Supported user roles for registration.
 * Maps to UserRole enum from shared-types.
 */
export enum RegisterableRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  PARTNER_STAFF = 'partner_staff',
  PARTNER_ADMIN = 'partner_admin',
  DEVELOPER = 'developer',
}

/**
 * POST /v1/auth/register
 * Creates a new user account in Auth0 + Supabase.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Valid email address is required' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @Length(8, 128, { message: 'Password must be between 8 and 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;

  @IsEnum(RegisterableRole, { message: 'Invalid role for self-registration' })
  role!: RegisterableRole;

  @IsOptional()
  @IsString()
  @Matches(/^\+27[0-9]{9}$/, { message: 'Phone must be a valid SA number (+27XXXXXXXXX)' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  displayName?: string;

  @IsBoolean({ message: 'POPIA consent acknowledgement is required' })
  popiaConsent!: boolean;
}

/**
 * POST /v1/auth/login
 * Authenticates user via Auth0 and returns JWT tokens.
 */
export class LoginDto {
  @IsEmail({}, { message: 'Valid email address is required' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

/**
 * POST /v1/auth/refresh
 * Exchanges a refresh token for new access + refresh tokens.
 * Implements token rotation per Auth0 best practices.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

/**
 * POST /v1/auth/logout
 * Invalidates the current session and blacklists tokens.
 */
export class LogoutDto {
  @IsString()
  @IsNotEmpty({ message: 'Access token is required' })
  accessToken!: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;
}

/**
 * POST /v1/auth/forgot-password
 * Initiates Auth0 password reset flow.
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Valid email address is required' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;
}

/**
 * POST /v1/auth/change-password
 * Changes password for authenticated user.
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: 'New password must contain uppercase, lowercase, number, and special character',
  })
  newPassword!: string;
}

/**
 * POST /v1/auth/verify-email
 * Verifies email address with token from email link.
 */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

/**
 * POST /v1/auth/api-keys
 * Generates a new API key for Developer Portal access.
 */
export class CreateApiKeyDto {
  @IsString()
  @Length(3, 100, { message: 'API key name must be between 3 and 100 characters' })
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @ValidateIf((o: CreateApiKeyDto) => o.expiresAt !== undefined)
  @IsString()
  expiresAt?: string;
}

/**
 * PATCH /v1/auth/api-keys/:id
 * Updates an existing API key.
 */
export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString({ each: true })
  scopes?: string[];
}

/**
 * DELETE /v1/auth/api-keys/:id
 * Revokes an API key.
 */
export class RevokeApiKeyDto {
  @IsUUID('4', { message: 'Valid API key ID is required' })
  id!: string;
}

/**
 * Token response returned after successful authentication.
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string;
}

/**
 * User session payload stored in Redis.
 */
export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  auth0Id: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * API Key record structure.
 */
export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  active: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Audit log entry for auth events.
 */
export interface AuthAuditEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: AuthAuditAction;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  traceId: string;
  timestamp: string;
}

/**
 * Auth-specific audit actions.
 */
export enum AuthAuditAction {
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILED = 'auth.login.failed',
  LOGOUT = 'auth.logout',
  REGISTER = 'auth.register',
  PASSWORD_CHANGE = 'auth.password.change',
  PASSWORD_RESET_REQUEST = 'auth.password.reset_request',
  TOKEN_REFRESH = 'auth.token.refresh',
  TOKEN_REVOKED = 'auth.token.revoked',
  API_KEY_CREATED = 'auth.api_key.created',
  API_KEY_REVOKED = 'auth.api_key.revoked',
  MFA_ENABLED = 'auth.mfa.enabled',
  MFA_DISABLED = 'auth.mfa.disabled',
  ACCOUNT_LOCKED = 'auth.account.locked',
  ACCOUNT_UNLOCKED = 'auth.account.unlocked',
  ROLE_CHANGED = 'auth.role.changed',
  SESSION_INVALIDATED = 'auth.session.invalidated',
  BIOMETRIC_VERIFIED = 'auth.biometric.verified',
  BIOMETRIC_FAILED = 'auth.biometric.failed',
}
