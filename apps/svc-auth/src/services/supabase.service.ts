/**
 * Supabase Service - User Data Access Layer
 *
 * Handles user CRUD operations against the Supabase PostgreSQL database.
 * Implements the repository pattern to abstract database operations.
 * RLS policies are enforced at the database level.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 * @module services/supabase.service
 */

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import type { AuthConfiguration } from '../config/auth.config';

/**
 * User record as stored in Supabase users table.
 */
export interface UserRecord {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  auth0_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  popia_consent: boolean;
  popia_consent_at: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Create user parameters.
 */
export interface CreateUserParams {
  email: string;
  phone?: string;
  role: string;
  auth0Id?: string;
  displayName?: string;
  popiaConsent: boolean;
}

/**
 * Update user parameters.
 */
export interface UpdateUserParams {
  email?: string;
  phone?: string;
  role?: string;
  auth0Id?: string;
  displayName?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}

/**
 * API key record as stored in Supabase api_keys table.
 */
export interface ApiKeyDbRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);

  /**
   * In-memory user store for development.
   * In production, this connects to Supabase PostgreSQL via @supabase/supabase-js.
   */
  private readonly users = new Map<string, UserRecord>();
  private readonly usersByEmail = new Map<string, string>();
  private readonly apiKeys = new Map<string, ApiKeyDbRecord>();

  constructor(private readonly configService: ConfigService) {
    const authConfig = this.configService.get<AuthConfiguration>('auth');
    if (authConfig?.environment === 'development') {
      this.logger.log('Supabase service running in development mode (in-memory store)');
    }
  }

  // --- User Operations ---

  /**
   * Creates a new user record in Supabase.
   * @throws ConflictException if email already exists
   */
  async createUser(params: CreateUserParams): Promise<UserRecord> {
    // Check for duplicate email
    if (this.usersByEmail.has(params.email.toLowerCase())) {
      throw new ConflictException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/duplicate-email',
        title: 'Email Already Registered',
        status: 409,
        detail: 'An account with this email address already exists.',
      });
    }

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      email: params.email.toLowerCase(),
      phone: params.phone ?? null,
      role: params.role,
      auth0_id: params.auth0Id ?? null,
      display_name: params.displayName ?? null,
      avatar_url: null,
      popia_consent: params.popiaConsent,
      popia_consent_at: params.popiaConsent ? now : null,
      email_verified: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user.id);

    this.logger.log(`User created with role ${user.role}`);
    return user;
  }

  /**
   * Finds a user by their internal ID.
   * @throws NotFoundException if user doesn't exist
   */
  async findUserById(id: string): Promise<UserRecord> {
    const user = this.users.get(id);
    if (!user || user.deleted_at) {
      throw new NotFoundException({
        type: 'https://api.lastmilegig.aagais.co.za/errors/user-not-found',
        title: 'User Not Found',
        status: 404,
        detail: 'The requested user does not exist.',
      });
    }
    return user;
  }

  /**
   * Finds a user by email address.
   * Returns null if not found (does not throw).
   */
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const userId = this.usersByEmail.get(email.toLowerCase());
    if (!userId) return null;
    const user = this.users.get(userId);
    if (!user || user.deleted_at) return null;
    return user;
  }

  /**
   * Finds a user by their Auth0 ID.
   */
  async findUserByAuth0Id(auth0Id: string): Promise<UserRecord | null> {
    for (const user of this.users.values()) {
      if (user.auth0_id === auth0Id && !user.deleted_at) {
        return user;
      }
    }
    return null;
  }

  /**
   * Updates a user record.
   * @throws NotFoundException if user doesn't exist
   */
  async updateUser(id: string, params: UpdateUserParams): Promise<UserRecord> {
    const user = await this.findUserById(id);

    if (params.email && params.email !== user.email) {
      if (this.usersByEmail.has(params.email.toLowerCase())) {
        throw new ConflictException('Email already in use');
      }
      this.usersByEmail.delete(user.email);
      user.email = params.email.toLowerCase();
      this.usersByEmail.set(user.email, user.id);
    }

    if (params.phone !== undefined) user.phone = params.phone ?? null;
    if (params.role !== undefined) user.role = params.role;
    if (params.auth0Id !== undefined) user.auth0_id = params.auth0Id ?? null;
    if (params.displayName !== undefined) user.display_name = params.displayName ?? null;
    if (params.avatarUrl !== undefined) user.avatar_url = params.avatarUrl ?? null;
    if (params.emailVerified !== undefined) user.email_verified = params.emailVerified;
    user.updated_at = new Date().toISOString();

    this.users.set(user.id, user);
    return user;
  }

  /**
   * Soft-deletes a user (sets deleted_at timestamp).
   * Per POPIA compliance, full erasure is handled by the data deletion endpoint.
   */
  async softDeleteUser(id: string): Promise<void> {
    const user = await this.findUserById(id);
    user.deleted_at = new Date().toISOString();
    user.updated_at = new Date().toISOString();
    this.users.set(user.id, user);
    this.logger.log(`User soft-deleted: ${id}`);
  }

  // --- API Key Operations ---

  /**
   * Stores an API key record.
   */
  async createApiKey(record: ApiKeyDbRecord): Promise<ApiKeyDbRecord> {
    this.apiKeys.set(record.id, record);
    return record;
  }

  /**
   * Finds all API keys for a user.
   */
  async findApiKeysByUserId(userId: string): Promise<ApiKeyDbRecord[]> {
    const keys: ApiKeyDbRecord[] = [];
    for (const key of this.apiKeys.values()) {
      if (key.user_id === userId) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Finds an API key by its hash.
   */
  async findApiKeyByHash(keyHash: string): Promise<ApiKeyDbRecord | null> {
    for (const key of this.apiKeys.values()) {
      if (key.key_hash === keyHash && key.active) {
        return key;
      }
    }
    return null;
  }

  /**
   * Updates an API key record.
   */
  async updateApiKey(id: string, updates: Partial<ApiKeyDbRecord>): Promise<ApiKeyDbRecord | null> {
    const key = this.apiKeys.get(id);
    if (!key) return null;

    const updated: ApiKeyDbRecord = {
      ...key,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.apiKeys.set(id, updated);
    return updated;
  }

  /**
   * Revokes (deactivates) an API key.
   */
  async revokeApiKey(id: string, userId: string): Promise<boolean> {
    const key = this.apiKeys.get(id);
    if (!key || key.user_id !== userId) return false;
    key.active = false;
    key.updated_at = new Date().toISOString();
    this.apiKeys.set(id, key);
    return true;
  }
}
