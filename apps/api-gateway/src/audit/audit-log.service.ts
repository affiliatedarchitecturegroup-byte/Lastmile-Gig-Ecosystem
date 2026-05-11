// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - Audit Log Service
// Phase: P069 | audit_log table, AuditLogService injectable
// -------------------------------------------------------------------

import { Injectable, Logger } from '@nestjs/common';

/** Audit log entry structure */
export interface AuditLogEntry {
  id?: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
  createdAt?: Date;
}

/** Audit action types */
export enum AuditAction {
  // Auth events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  TOKEN_REFRESH = 'token_refresh',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',

  // Data events
  DATA_ACCESSED = 'data_accessed',
  DATA_CREATED = 'data_created',
  DATA_UPDATED = 'data_updated',
  DATA_DELETED = 'data_deleted',
  DATA_EXPORTED = 'data_exported',

  // Consent events
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_WITHDRAWN = 'consent_withdrawn',
  DATA_ERASURE_REQUESTED = 'data_erasure_requested',
  DATA_ERASURE_COMPLETED = 'data_erasure_completed',
  DATA_ERASURE_CANCELLED = 'data_erasure_cancelled',

  // Admin events
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_CHANGED = 'permission_changed',
  CONFIG_CHANGED = 'config_changed',

  // Driver events
  BIOMETRIC_CAPTURED = 'biometric_captured',
  BIOMETRIC_VERIFIED = 'biometric_verified',
  DRIVER_ACTIVATED = 'driver_activated',
  DRIVER_DEACTIVATED = 'driver_deactivated',
  SHIFT_STARTED = 'shift_started',
  SHIFT_ENDED = 'shift_ended',

  // Order events
  ORDER_PLACED = 'order_placed',
  ORDER_DISPATCHED = 'order_dispatched',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',

  // Payment events
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  PAYOUT_TRIGGERED = 'payout_triggered',
  REFUND_PROCESSED = 'refund_processed',

  // HITL events
  HITL_DECISION_PENDING = 'hitl_decision_pending',
  HITL_DECISION_APPROVED = 'hitl_decision_approved',
  HITL_DECISION_REJECTED = 'hitl_decision_rejected',

  // Blockchain events
  BLOCKCHAIN_RECORD_CREATED = 'blockchain_record_created',
  BLOCKCHAIN_RECORD_VERIFIED = 'blockchain_record_verified',
}

/**
 * Injectable audit log service for recording all platform events.
 * Every security-relevant, data access, and administrative action
 * is logged to the audit_log table for POPIA compliance.
 *
 * IMPORTANT: No PII is stored in audit log details. User IDs
 * and entity IDs are used as references only.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  /**
   * Log an audit event.
   * Non-blocking: fires and forgets to avoid impacting request latency.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Sanitise details to remove any PII
      const sanitisedDetails = this.sanitiseDetails(entry.details);

      const auditEntry = {
        ...entry,
        details: sanitisedDetails,
        createdAt: new Date(),
      };

      // TODO: Insert into Supabase audit_log table
      // const { error } = await supabase
      //   .from('audit_log')
      //   .insert(auditEntry);
      //
      // if (error) {
      //   this.logger.error(`Audit log write failed: ${error.message}`);
      // }

      this.logger.debug(
        `Audit: ${entry.action} on ${entry.entityType}/${entry.entityId} by ${entry.userId.substring(0, 8)}...`,
      );
    } catch (error) {
      // Audit logging failures should not break the application
      this.logger.error(
        `Audit log error: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /**
   * Log multiple audit events in a batch.
   */
  async logBatch(entries: AuditLogEntry[]): Promise<void> {
    const sanitisedEntries = entries.map((entry) => ({
      ...entry,
      details: this.sanitiseDetails(entry.details),
      createdAt: new Date(),
    }));

    try {
      // TODO: Batch insert into Supabase
      this.logger.debug(`Audit batch: ${sanitisedEntries.length} entries queued`);
    } catch (error) {
      this.logger.error(
        `Audit batch error: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /**
   * Query audit log entries for a specific entity.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  async getByEntity(
    entityType: string,
    entityId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<AuditLogEntry[]> {
    // TODO: Query Supabase audit_log table
    this.logger.debug(
      `Audit query: ${entityType}/${entityId} (limit: ${limit}, offset: ${offset})`,
    );
    return [];
  }

  /**
   * Query audit log entries for a specific user.
   * Users can view their own audit trail; admins can view any.
   */
  async getByUser(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<AuditLogEntry[]> {
    // TODO: Query Supabase audit_log table
    this.logger.debug(
      `Audit query for user: ${userId.substring(0, 8)}... (limit: ${limit}, offset: ${offset})`,
    );
    return [];
  }

  /**
   * Remove PII from audit log details.
   * Ensures no names, emails, phones, or biometric data
   * are stored in the audit trail.
   */
  private sanitiseDetails(
    details: Record<string, unknown>,
  ): Record<string, unknown> {
    const PII_FIELDS = [
      'email',
      'phone',
      'name',
      'firstName',
      'lastName',
      'address',
      'idNumber',
      'bankAccount',
      'cardNumber',
      'biometric',
      'facial_template',
      'password',
      'secret',
      'token',
    ];

    const sanitised: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      const lowerKey = key.toLowerCase();
      if (PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
        sanitised[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitised[key] = this.sanitiseDetails(value as Record<string, unknown>);
      } else {
        sanitised[key] = value;
      }
    }

    return sanitised;
  }
}
