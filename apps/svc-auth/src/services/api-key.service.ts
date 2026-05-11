/**
 * API Key Service - Developer Portal Key Management
 *
 * Generates, validates, lists, and revokes API keys for the Developer Portal.
 * Keys are hashed using SHA-256 before storage; the plaintext key is shown
 * only once at creation time.
 *
 * @see docs/specs/12_API_INTEGRATION_SPEC.md - Section 4
 * @module services/api-key.service
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes, createHash, randomUUID } from 'crypto';

import { SupabaseService } from './supabase.service';
import { AuditService } from './audit.service';
import { AuthAuditAction } from '../dto/auth.dto';
import type { ApiKeyDbRecord } from './supabase.service';

/**
 * Result of API key creation (includes plaintext key).
 */
export interface CreateApiKeyResult {
  id: string;
  name: string;
  key: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
}

/**
 * API key listing result (no plaintext key).
 */
export interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  active: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * API key validation result.
 */
export interface ApiKeyValidationResult {
  valid: boolean;
  userId: string | null;
  scopes: string[];
  keyId: string | null;
}

/**
 * Default scopes available for API keys.
 */
export const AVAILABLE_SCOPES = [
  'read:restaurants',
  'read:menus',
  'write:orders',
  'read:orders',
  'read:drivers',
  'write:webhooks',
  'read:analytics',
] as const;

/**
 * Rate limit tiers for API keys.
 */
export const API_KEY_TIERS = {
  basic: { requestsPerHour: 1000, label: 'Basic' },
  pro: { requestsPerHour: 10000, label: 'Pro' },
  enterprise: { requestsPerHour: -1, label: 'Enterprise (unlimited)' },
} as const;

/** API key prefix for identification */
const KEY_PREFIX = 'lmg_';
/** Key length in bytes (before base64 encoding) */
const KEY_LENGTH_BYTES = 32;
/** Prefix display length */
const PREFIX_DISPLAY_LENGTH = 8;

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates a new API key for a user.
   * The plaintext key is returned only once at creation time.
   *
   * @param userId - Owner of the API key
   * @param name - Human-readable key name
   * @param description - Optional description
   * @param scopes - Allowed scopes for this key
   * @param expiresAt - Optional expiry date (ISO 8601)
   * @returns Create result with the plaintext key
   */
  async createApiKey(
    userId: string,
    name: string,
    description?: string,
    scopes?: string[],
    expiresAt?: string,
  ): Promise<CreateApiKeyResult> {
    // Validate scopes
    const validScopes = scopes?.filter((s): s is string =>
      (AVAILABLE_SCOPES as readonly string[]).includes(s),
    ) ?? ['read:restaurants', 'read:menus'];

    // Generate the key
    const rawKey = randomBytes(KEY_LENGTH_BYTES).toString('base64url');
    const fullKey = `${KEY_PREFIX}${rawKey}`;
    const keyHash = this.hashKey(fullKey);
    const keyPrefix = fullKey.substring(0, KEY_PREFIX.length + PREFIX_DISPLAY_LENGTH);

    const now = new Date().toISOString();
    const record: ApiKeyDbRecord = {
      id: randomUUID(),
      user_id: userId,
      name,
      description: description ?? null,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes: validScopes,
      active: true,
      last_used_at: null,
      expires_at: expiresAt ?? null,
      created_at: now,
      updated_at: now,
    };

    await this.supabaseService.createApiKey(record);

    // Audit log
    await this.auditService.log({
      actorId: userId,
      actorEmail: '',
      action: AuthAuditAction.API_KEY_CREATED,
      resource: 'api_key',
      resourceId: record.id,
      metadata: { name, scopes: validScopes, prefix: keyPrefix },
      ipAddress: 'internal',
      userAgent: 'api-key-service',
    });

    this.logger.log(`API key created: ${keyPrefix}*** for user ${userId}`);

    return {
      id: record.id,
      name: record.name,
      key: fullKey,
      prefix: keyPrefix,
      scopes: validScopes,
      expiresAt: record.expires_at,
    };
  }

  /**
   * Lists all API keys for a user (without plaintext keys).
   */
  async listApiKeys(userId: string): Promise<ApiKeyListItem[]> {
    const records = await this.supabaseService.findApiKeysByUserId(userId);
    return records.map((r) => ({
      id: r.id,
      name: r.name,
      prefix: r.key_prefix,
      scopes: r.scopes,
      active: r.active,
      lastUsedAt: r.last_used_at,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    }));
  }

  /**
   * Updates an API key's metadata.
   */
  async updateApiKey(
    keyId: string,
    userId: string,
    updates: { name?: string; description?: string; active?: boolean; scopes?: string[] },
  ): Promise<{ id: string; name: string; active: boolean } | null> {
    const records = await this.supabaseService.findApiKeysByUserId(userId);
    const key = records.find((r) => r.id === keyId);

    if (!key) {
      throw new NotFoundException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/api-key-not-found',
        title: 'API Key Not Found',
        status: 404,
        detail: 'The specified API key does not exist or does not belong to you.',
      });
    }

    const updatePayload: Partial<ApiKeyDbRecord> = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.active !== undefined) updatePayload.active = updates.active;
    if (updates.scopes !== undefined) updatePayload.scopes = updates.scopes;

    const updated = await this.supabaseService.updateApiKey(keyId, updatePayload);
    if (!updated) return null;

    return { id: updated.id, name: updated.name, active: updated.active };
  }

  /**
   * Revokes an API key permanently.
   */
  async revokeApiKey(
    keyId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const success = await this.supabaseService.revokeApiKey(keyId, userId);
    if (!success) {
      throw new NotFoundException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/api-key-not-found',
        title: 'API Key Not Found',
        status: 404,
        detail: 'The specified API key does not exist or does not belong to you.',
      });
    }

    await this.auditService.log({
      actorId: userId,
      actorEmail: '',
      action: AuthAuditAction.API_KEY_REVOKED,
      resource: 'api_key',
      resourceId: keyId,
      metadata: {},
      ipAddress,
      userAgent,
    });

    this.logger.log(`API key revoked: ${keyId}`);
  }

  /**
   * Validates an API key from an incoming request.
   * Returns the associated user ID and scopes if valid.
   */
  async validateApiKey(key: string): Promise<ApiKeyValidationResult> {
    if (!key.startsWith(KEY_PREFIX)) {
      return { valid: false, userId: null, scopes: [], keyId: null };
    }

    const keyHash = this.hashKey(key);
    const record = await this.supabaseService.findApiKeyByHash(keyHash);

    if (!record) {
      return { valid: false, userId: null, scopes: [], keyId: null };
    }

    // Check if expired
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return { valid: false, userId: null, scopes: [], keyId: null };
    }

    // Check if active
    if (!record.active) {
      return { valid: false, userId: null, scopes: [], keyId: null };
    }

    // Update last_used_at
    await this.supabaseService.updateApiKey(record.id, {
      last_used_at: new Date().toISOString(),
    });

    return {
      valid: true,
      userId: record.user_id,
      scopes: record.scopes,
      keyId: record.id,
    };
  }

  /**
   * Hashes an API key using SHA-256.
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
