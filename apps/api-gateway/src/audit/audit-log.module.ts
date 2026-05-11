// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - Audit Log Module
// Phase: P069 | Audit logging module registration
// -------------------------------------------------------------------

import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

/**
 * Global audit log module.
 * Marked as @Global so AuditLogService can be injected
 * anywhere without explicit module imports.
 */
@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
