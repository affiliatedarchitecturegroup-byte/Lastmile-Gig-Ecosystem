// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - API Key Guard
// Phase: P062 | API key generation, hashing, validation
// -------------------------------------------------------------------

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

/** API key metadata */
export interface ApiKeyRecord {
  id: string;
  hashedKey: string;
  name: string;
  ownerId: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

/**
 * Guard that validates API keys from the X-API-Key header.
 * API keys are hashed with SHA-256 before storage and comparison.
 * Used for Developer Portal access and M2M integrations.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    // Validate API key format: lmg_live_xxxx or lmg_test_xxxx
    if (!this.isValidKeyFormat(apiKey)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // Hash the key and look up in database
    const hashedKey = this.hashApiKey(apiKey);

    // TODO: Replace with actual database lookup when Supabase is configured
    const keyRecord = await this.findApiKey(hashedKey);

    if (!keyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!keyRecord.isActive) {
      throw new UnauthorizedException('API key is deactivated');
    }

    if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
      throw new UnauthorizedException('API key has expired');
    }

    // Attach key metadata to request
    (request as Record<string, unknown>)['apiKey'] = keyRecord;

    return true;
  }

  /** Hash API key with SHA-256 for secure storage and comparison */
  static hashKey(rawKey: string): string {
    return crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex');
  }

  /** Generate a new API key with environment prefix */
  static generateKey(environment: 'live' | 'test'): string {
    const randomPart = crypto.randomBytes(32).toString('base64url');
    return `lmg_${environment}_${randomPart}`;
  }

  /** Validate API key format */
  private isValidKeyFormat(key: string): boolean {
    return /^lmg_(live|test)_[A-Za-z0-9_-]{43}$/.test(key);
  }

  /** Hash API key for database comparison */
  private hashApiKey(key: string): string {
    return ApiKeyGuard.hashKey(key);
  }

  /** Look up API key in database (placeholder) */
  private async findApiKey(
    _hashedKey: string,
  ): Promise<ApiKeyRecord | null> {
    // TODO: Implement Supabase lookup in Phase P097
    // SELECT * FROM api_keys WHERE hashed_key = $1 AND is_active = true
    this.logger.debug('API key lookup - database integration pending (Phase P097)');
    return null;
  }
}
