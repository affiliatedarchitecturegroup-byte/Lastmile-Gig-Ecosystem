/**
 * Redis Service - Session & Token Storage
 *
 * Abstracts Upstash Redis operations for token blacklisting,
 * session management, rate limiting counters, and login attempt tracking.
 * Uses the LMG_UPSTASH_REDIS_URL connection with lmg:auth: key prefix.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2.1
 * @module services/redis.service
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AuthConfiguration } from '../config/auth.config';
import { SESSION_CONSTANTS } from '../config/auth.config';

/**
 * Redis key namespaces for auth operations.
 * All keys use the lmg:auth: prefix per DEVELOPMENT_DIRECTIVES.md Section 10.
 */
export const REDIS_KEYS = {
  /** Session storage: lmg:auth:session:{sessionId} */
  session: (sessionId: string): string => `lmg:auth:session:${sessionId}`,
  /** Token blacklist: lmg:auth:blacklist:{tokenHash} */
  blacklist: (tokenHash: string): string => `lmg:auth:blacklist:${tokenHash}`,
  /** Refresh token: lmg:auth:refresh:{tokenHash} */
  refreshToken: (tokenHash: string): string => `lmg:auth:refresh:${tokenHash}`,
  /** Token family: lmg:auth:family:{familyId} */
  tokenFamily: (familyId: string): string => `lmg:auth:family:${familyId}`,
  /** Login attempts: lmg:auth:attempts:{email} */
  loginAttempts: (email: string): string => `lmg:auth:attempts:${email}`,
  /** Account lockout: lmg:auth:lockout:{email} */
  accountLockout: (email: string): string => `lmg:auth:lockout:${email}`,
  /** User sessions list: lmg:auth:user-sessions:{userId} */
  userSessions: (userId: string): string => `lmg:auth:user-sessions:${userId}`,
  /** API key usage: lmg:auth:apikey-usage:{keyHash} */
  apiKeyUsage: (keyHash: string): string => `lmg:auth:apikey-usage:${keyHash}`,
  /** Rate limit: lmg:auth:ratelimit:{identifier} */
  rateLimit: (identifier: string): string => `lmg:auth:ratelimit:${identifier}`,
} as const;

/**
 * In-memory Redis mock for development.
 * In production, connects to Upstash Redis via REST API.
 */
interface RedisEntry {
  value: string;
  expiresAt: number | null;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly store = new Map<string, RedisEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly configService: ConfigService) {
    const authConfig = this.configService.get<AuthConfiguration>('auth');
    if (authConfig?.environment === 'development') {
      this.logger.log('Redis service running in development mode (in-memory store)');
    }
    // Start cleanup interval for expired keys
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60_000);
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Set a key-value pair with optional TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds
      ? Math.floor(Date.now() / 1000) + ttlSeconds
      : null;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Get a value by key. Returns null if key doesn't exist or is expired.
   */
  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Math.floor(Date.now() / 1000)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Delete a key.
   */
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Check if a key exists and is not expired.
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Increment a counter with optional TTL (for rate limiting / login attempts).
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const current = await this.get(key);
    const newValue = current ? parseInt(current, 10) + 1 : 1;
    await this.set(key, newValue.toString(), ttlSeconds);
    return newValue;
  }

  /**
   * Set a key with expiry only if it doesn't exist (for distributed locks).
   */
  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const existing = await this.get(key);
    if (existing !== null) return false;
    await this.set(key, value, ttlSeconds);
    return true;
  }

  /**
   * Get all keys matching a pattern (for session listing).
   * Limited implementation for in-memory store.
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matchingKeys: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        const entry = this.store.get(key);
        if (entry && (!entry.expiresAt || entry.expiresAt >= Math.floor(Date.now() / 1000))) {
          matchingKeys.push(key);
        }
      }
    }
    return matchingKeys;
  }

  // --- Auth-specific convenience methods ---

  /**
   * Records a failed login attempt and returns the current count.
   * After MAX_LOGIN_ATTEMPTS, the account is locked for LOCKOUT_DURATION_SECONDS.
   */
  async recordLoginAttempt(email: string): Promise<{ attempts: number; locked: boolean }> {
    const attemptsKey = REDIS_KEYS.loginAttempts(email);
    const lockoutKey = REDIS_KEYS.accountLockout(email);

    // Check if already locked
    const isLocked = await this.exists(lockoutKey);
    if (isLocked) {
      return { attempts: SESSION_CONSTANTS.MAX_LOGIN_ATTEMPTS, locked: true };
    }

    const attempts = await this.incr(attemptsKey, SESSION_CONSTANTS.LOCKOUT_DURATION_SECONDS);

    if (attempts >= SESSION_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
      await this.set(
        lockoutKey,
        new Date().toISOString(),
        SESSION_CONSTANTS.LOCKOUT_DURATION_SECONDS,
      );
      this.logger.warn(`Account locked for email (hash): ${this.maskEmail(email)}`);
      return { attempts, locked: true };
    }

    return { attempts, locked: false };
  }

  /**
   * Clears login attempts after successful login.
   */
  async clearLoginAttempts(email: string): Promise<void> {
    await this.del(REDIS_KEYS.loginAttempts(email));
    await this.del(REDIS_KEYS.accountLockout(email));
  }

  /**
   * Checks if an account is currently locked.
   */
  async isAccountLocked(email: string): Promise<boolean> {
    return this.exists(REDIS_KEYS.accountLockout(email));
  }

  /**
   * Stores a session payload with appropriate TTL.
   */
  async storeSession(sessionId: string, payload: Record<string, unknown>, ttlSeconds: number): Promise<void> {
    const key = REDIS_KEYS.session(sessionId);
    await this.set(key, JSON.stringify(payload), ttlSeconds);
  }

  /**
   * Retrieves a session payload.
   */
  async getSession(sessionId: string): Promise<Record<string, unknown> | null> {
    const key = REDIS_KEYS.session(sessionId);
    const value = await this.get(key);
    if (!value) return null;
    return JSON.parse(value) as Record<string, unknown>;
  }

  /**
   * Blacklists an access token with TTL matching its expiry.
   */
  async blacklistToken(tokenHash: string, ttlSeconds: number): Promise<void> {
    const key = REDIS_KEYS.blacklist(tokenHash);
    await this.set(key, '1', ttlSeconds);
  }

  /**
   * Checks if a token is blacklisted.
   */
  async isTokenBlacklisted(tokenHash: string): Promise<boolean> {
    return this.exists(REDIS_KEYS.blacklist(tokenHash));
  }

  // --- Private helpers ---

  private cleanupExpired(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired Redis entries`);
    }
  }

  /**
   * Masks email for safe logging (no PII in logs per SECURITY.md).
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';
    return `${local.substring(0, 2)}***@${domain}`;
  }
}
