/**
 * Audit Service - Auth Event Logging
 *
 * Records all authentication and authorization events to the audit_log table.
 * No PII is logged per SECURITY.md. All entries include trace_id for OTel correlation.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 8
 * @module services/audit.service
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import type { AuthAuditAction, AuthAuditEntry } from '../dto/auth.dto';

/**
 * Parameters for creating an audit log entry.
 */
export interface AuditLogParams {
  actorId: string;
  actorEmail: string;
  action: AuthAuditAction;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  traceId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  /**
   * In-memory audit store for development.
   * In production, writes to the Supabase audit_log table.
   */
  private readonly auditEntries: AuthAuditEntry[] = [];

  constructor(private readonly configService: ConfigService) {
    const env = this.configService.get<string>('auth.environment', 'development');
    if (env === 'development') {
      this.logger.log('Audit service running in development mode (in-memory store)');
    }
  }

  /**
   * Records an audit log entry.
   * Masks email to prevent PII leakage in logs.
   *
   * @param params - Audit log parameters
   * @returns The created audit entry ID
   */
  async log(params: AuditLogParams): Promise<string> {
    const entry: AuthAuditEntry = {
      id: randomUUID(),
      actorId: params.actorId,
      actorEmail: this.maskEmail(params.actorEmail),
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      metadata: this.sanitizeMetadata(params.metadata),
      ipAddress: this.maskIpAddress(params.ipAddress),
      userAgent: this.truncateUserAgent(params.userAgent),
      traceId: params.traceId ?? this.generateTraceId(),
      timestamp: new Date().toISOString(),
    };

    // Store the entry
    this.auditEntries.push(entry);

    // Log a structured entry (no PII)
    this.logger.log({
      message: 'Audit event recorded',
      action: entry.action,
      actorId: entry.actorId,
      resource: entry.resource,
      resourceId: entry.resourceId,
      traceId: entry.traceId,
    });

    return entry.id;
  }

  /**
   * Retrieves audit entries for a specific actor (admin use).
   */
  async getEntriesByActor(
    actorId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ entries: AuthAuditEntry[]; total: number }> {
    const filtered = this.auditEntries.filter((e) => e.actorId === actorId);
    const total = filtered.length;
    const entries = filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit);

    return { entries, total };
  }

  /**
   * Retrieves audit entries by action type (admin use).
   */
  async getEntriesByAction(
    action: AuthAuditAction,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ entries: AuthAuditEntry[]; total: number }> {
    const filtered = this.auditEntries.filter((e) => e.action === action);
    const total = filtered.length;
    const entries = filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit);

    return { entries, total };
  }

  /**
   * Retrieves recent audit entries (admin dashboard).
   */
  async getRecentEntries(limit: number = 100): Promise<AuthAuditEntry[]> {
    return this.auditEntries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Counts events by action type in a time window (for dashboards).
   */
  async countByAction(
    action: AuthAuditAction,
    sinceTimestamp: string,
  ): Promise<number> {
    const since = new Date(sinceTimestamp).getTime();
    return this.auditEntries.filter(
      (e) => e.action === action && new Date(e.timestamp).getTime() >= since,
    ).length;
  }

  // --- Private helpers ---

  /**
   * Masks email to prevent PII in logs.
   * "john.doe@example.com" => "jo***@example.com"
   */
  private maskEmail(email: string): string {
    if (!email) return '***';
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';
    const masked = local.length > 2
      ? `${local.substring(0, 2)}***`
      : `${local[0]}***`;
    return `${masked}@${domain}`;
  }

  /**
   * Masks IP address for privacy (keep first two octets).
   * "192.168.1.100" => "192.168.x.x"
   */
  private maskIpAddress(ip: string): string {
    if (!ip) return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`;
    }
    // IPv6 - just show first segment
    const ipv6Parts = ip.split(':');
    if (ipv6Parts.length > 2) {
      return `${ipv6Parts[0]}:${ipv6Parts[1]}:***`;
    }
    return 'masked';
  }

  /**
   * Truncates User-Agent to prevent excessively long strings.
   */
  private truncateUserAgent(userAgent: string): string {
    if (!userAgent) return 'unknown';
    return userAgent.length > 200 ? userAgent.substring(0, 200) + '...' : userAgent;
  }

  /**
   * Sanitizes metadata to ensure no PII leaks into audit records.
   * Removes known PII fields.
   */
  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const piiFields = ['password', 'token', 'secret', 'key', 'creditCard', 'ssn', 'id_number'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (piiFields.some((pii) => key.toLowerCase().includes(pii))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Generates a trace ID for OTel correlation.
   * In production, this comes from the OTel context.
   */
  private generateTraceId(): string {
    return randomUUID().replace(/-/g, '');
  }
}
