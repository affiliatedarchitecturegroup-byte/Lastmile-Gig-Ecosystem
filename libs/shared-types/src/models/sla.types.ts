/**
 * SLA Contract type definitions.
 * Maps to the `sla_contracts` table and blockchain PartnerSLA.sol.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.3
 */

export interface SlaContract {
  id: string;
  partnerId: string;
  deliveryTargetMinutes: number;
  breachPenaltyZar: number;
  perfectWeekBonusZar: number;
  contractStart: string;
  contractEnd: string;
  blockchainAddress: string | null;
  active: boolean;
}

export interface SlaComplianceReport {
  contractId: string;
  partnerId: string;
  period: string;
  totalDeliveries: number;
  onTimeDeliveries: number;
  breachCount: number;
  complianceRate: number;
  penaltyAmount: number;
  bonusAmount: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
