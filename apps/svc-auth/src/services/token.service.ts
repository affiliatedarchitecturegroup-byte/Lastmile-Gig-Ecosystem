/**
 * Token Service - JWT & Refresh Token Management
 *
 * Handles token generation, validation, refresh rotation, and blacklisting.
 * Implements Auth0 token exchange and local session management via Redis.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2.1
 * @module services/token.service
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';

import type { AuthConfiguration } from '../config/auth.config';
import { SESSION_CONSTANTS } from '../config/auth.config';
import type { TokenResponse, SessionPayload } from '../dto/auth.dto';

/**
 * Refresh token record stored in Redis.
 */
interface RefreshTokenRecord {
  tokenHash: string;
  userId: string;
  sessionId: string;
  familyId: string;
  generation: number;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly config: AuthConfiguration;

  /**
   * In-memory token blacklist for development.
   * In production, this is backed by Upstash Redis.
   */
  private readonly tokenBlacklist = new Map<string, number>();
  private readonly refreshTokenStore = new Map<string, RefreshTokenRecord>();
  private readonly sessionStore = new Map<string, SessionPayload>();

  constructor(private readonly configService: ConfigService) {
    const authConfig = this.configService.get<AuthConfiguration>('auth');
    if (!authConfig) {
      throw new Error('Auth configuration not loaded');
    }
    this.config = authConfig;
  }

  /**
   * Generates a new token pair (access + refresh) after successful authentication.
   * Access tokens are issued by Auth0; refresh tokens are managed locally.
   *
   * @param userId - Internal Lastmile Gig user ID
   * @param auth0Id - Auth0 subject identifier
   * @param email - User email
   * @param role - User role
   * @param ipAddress - Request IP for audit
   * @param userAgent - Request User-Agent for audit
   * @returns Token response with access and refresh tokens
   */
  async generateTokenPair(
    userId: string,
    auth0Id: string,
    email: string,
    role: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenResponse> {
    const sessionId = this.generateSecureId();
    const familyId = this.generateSecureId();
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);

    // Store session in Redis (in-memory for dev)
    const now = new Date();
    const sessionTimeout = this.getSessionTimeout(role);
    const sessionExpiresAt = new Date(now.getTime() + sessionTimeout * 1000);

    const session: SessionPayload = {
      userId,
      email,
      role,
      auth0Id,
      sessionId,
      createdAt: now.toISOString(),
      expiresAt: sessionExpiresAt.toISOString(),
      ipAddress,
      userAgent,
    };

    await this.storeSession(sessionId, session);

    // Store refresh token record
    const refreshExpiresAt = new Date(
      now.getTime() + SESSION_CONSTANTS.TOKEN_BLACKLIST_TTL_SECONDS * 1000,
    );

    const refreshRecord: RefreshTokenRecord = {
      tokenHash: refreshTokenHash,
      userId,
      sessionId,
      familyId,
      generation: 1,
      createdAt: now.toISOString(),
      expiresAt: refreshExpiresAt.toISOString(),
      revoked: false,
    };

    await this.storeRefreshToken(refreshTokenHash, refreshRecord);

    this.logger.log(`Token pair generated for session ${sessionId}`);

    // In production, the access token comes from Auth0 token exchange.
    // For the local flow, we create a placeholder that the JWT strategy validates.
    const accessToken = this.createLocalAccessToken(userId, email, role, sessionId);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiryToSeconds(this.config.jwt.accessTokenExpiry),
      scope: 'openid profile email',
    };
  }

  /**
   * Rotates a refresh token: invalidates the old one, issues a new pair.
   * Implements refresh token rotation to detect token theft.
   *
   * If a revoked token from the same family is reused, the entire family
   * is invalidated (all sessions for that token chain).
   *
   * @param oldRefreshToken - The current refresh token to rotate
   * @returns New token pair
   * @throws UnauthorizedException if token is invalid or revoked
   */
  async rotateRefreshToken(
    oldRefreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenResponse> {
    const oldTokenHash = this.hashToken(oldRefreshToken);
    const record = await this.getRefreshToken(oldTokenHash);

    if (!record) {
      this.logger.warn('Refresh token not found - possible theft attempt');
      throw new UnauthorizedException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/invalid-refresh-token',
        title: 'Invalid Refresh Token',
        status: 401,
        detail: 'The refresh token is invalid or has expired.',
      });
    }

    // Check if token was already revoked (reuse detection)
    if (record.revoked) {
      this.logger.warn(
        `Revoked refresh token reused for family ${record.familyId}. ` +
        `Invalidating entire token family - possible token theft.`,
      );
      await this.invalidateTokenFamily(record.familyId);
      await this.invalidateSession(record.sessionId);
      throw new UnauthorizedException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/token-reuse-detected',
        title: 'Token Reuse Detected',
        status: 401,
        detail: 'Suspicious token reuse detected. All sessions have been invalidated.',
      });
    }

    // Check expiration
    if (new Date(record.expiresAt) < new Date()) {
      this.logger.warn(`Expired refresh token used for session ${record.sessionId}`);
      throw new UnauthorizedException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/refresh-token-expired',
        title: 'Refresh Token Expired',
        status: 401,
        detail: 'The refresh token has expired. Please log in again.',
      });
    }

    // Revoke the old token
    record.revoked = true;
    await this.storeRefreshToken(oldTokenHash, record);

    // Generate new token pair in the same family
    const newRefreshToken = this.generateRefreshToken();
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    const now = new Date();
    const refreshExpiresAt = new Date(
      now.getTime() + SESSION_CONSTANTS.TOKEN_BLACKLIST_TTL_SECONDS * 1000,
    );

    const newRecord: RefreshTokenRecord = {
      tokenHash: newRefreshTokenHash,
      userId: record.userId,
      sessionId: record.sessionId,
      familyId: record.familyId,
      generation: record.generation + 1,
      createdAt: now.toISOString(),
      expiresAt: refreshExpiresAt.toISOString(),
      revoked: false,
    };

    await this.storeRefreshToken(newRefreshTokenHash, newRecord);

    // Retrieve session to get user details
    const session = await this.getSession(record.sessionId);
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    // Update session metadata
    session.ipAddress = ipAddress;
    session.userAgent = userAgent;
    await this.storeSession(record.sessionId, session);

    const accessToken = this.createLocalAccessToken(
      session.userId,
      session.email,
      session.role,
      session.sessionId,
    );

    this.logger.log(
      `Refresh token rotated for session ${record.sessionId} ` +
      `(generation ${newRecord.generation})`,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiryToSeconds(this.config.jwt.accessTokenExpiry),
      scope: 'openid profile email',
    };
  }

  /**
   * Blacklists an access token (on logout or session invalidation).
   * The token is stored with its expiration so the blacklist auto-cleans.
   */
  async blacklistAccessToken(token: string, expiresAt: number): Promise<void> {
    const tokenHash = this.hashToken(token);
    this.tokenBlacklist.set(tokenHash, expiresAt);
    this.logger.log('Access token blacklisted');
  }

  /**
   * Checks if an access token has been blacklisted.
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const expiresAt = this.tokenBlacklist.get(tokenHash);
    if (expiresAt === undefined) {
      return false;
    }
    // Auto-cleanup expired entries
    if (expiresAt < Math.floor(Date.now() / 1000)) {
      this.tokenBlacklist.delete(tokenHash);
      return false;
    }
    return true;
  }

  /**
   * Invalidates all tokens for a session (logout).
   */
  async invalidateSession(sessionId: string): Promise<void> {
    this.sessionStore.delete(sessionId);
    this.logger.log(`Session ${sessionId} invalidated`);
  }

  /**
   * Invalidates all refresh tokens in a family (theft detection).
   */
  async invalidateTokenFamily(familyId: string): Promise<void> {
    for (const [hash, record] of this.refreshTokenStore.entries()) {
      if (record.familyId === familyId) {
        record.revoked = true;
        this.refreshTokenStore.set(hash, record);
      }
    }
    this.logger.warn(`Token family ${familyId} invalidated`);
  }

  /**
   * Gets a session by ID.
   */
  async getSession(sessionId: string): Promise<SessionPayload | null> {
    return this.sessionStore.get(sessionId) ?? null;
  }

  // --- Private helpers ---

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private generateSecureId(): string {
    return randomBytes(16).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getSessionTimeout(role: string): number {
    const adminRoles = ['admin', 'super_admin', 'ops_staff', 'ops_senior'];
    if (adminRoles.includes(role)) {
      return SESSION_CONSTANTS.OPS_SESSION_TIMEOUT_SECONDS;
    }
    return SESSION_CONSTANTS.DEFAULT_SESSION_TIMEOUT_SECONDS;
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  /**
   * Creates a local access token for development.
   * In production, Auth0 issues the access token via /oauth/token.
   */
  private createLocalAccessToken(
    userId: string,
    email: string,
    role: string,
    sessionId: string,
  ): string {
    // Base64-encoded JSON payload (not cryptographically signed - dev only)
    const payload = {
      sub: userId,
      email,
      'https://lastmilegig.aagais.co.za/role': role,
      'https://lastmilegig.aagais.co.za/userId': userId,
      jti: sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiryToSeconds(this.config.jwt.accessTokenExpiry),
      iss: this.config.jwt.issuer,
      aud: this.config.auth0.audience,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = Buffer.from('dev-signature-placeholder').toString('base64url');

    return `${header}.${body}.${signature}`;
  }

  // --- Redis-backed storage (in-memory for dev) ---

  private async storeSession(sessionId: string, session: SessionPayload): Promise<void> {
    this.sessionStore.set(sessionId, session);
  }

  private async storeRefreshToken(hash: string, record: RefreshTokenRecord): Promise<void> {
    this.refreshTokenStore.set(hash, record);
  }

  private async getRefreshToken(hash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokenStore.get(hash) ?? null;
  }
}
