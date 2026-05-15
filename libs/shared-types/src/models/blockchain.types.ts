/**
 * Blockchain type definitions for the Lastmile Gig platform.
 *
 * Shared types for blockchain service interactions, smart contract
 * data structures, and on-chain verification records.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 */

// --- Delivery Verification ---

export interface BlockchainDeliveryRecord {
  orderId: string;
  driverId: string;
  customerId: string;
  deliveryLat: number;
  deliveryLng: number;
  timestamp: number;
  photoHash: string;
  signatureHash: string;
  verified: boolean;
  disputed: boolean;
  blockNumber: number;
  txHash: string;
}

export interface RecordDeliveryRequest {
  orderId: string;
  driverId: string;
  customerId: string;
  latitude: number;
  longitude: number;
  photoHash: string;
  signatureHash: string;
}

export interface DeliveryVerificationResult {
  orderId: string;
  verified: boolean;
  timestamp: number;
  photoHash: string;
  blockNumber: number;
}

// --- Driver Payout ---

export enum EscrowStatus {
  CREATED = 'CREATED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

export interface PayoutEscrow {
  orderId: string;
  driverWallet: string;
  amountWei: string;
  status: EscrowStatus;
  createdAt: number;
  releaseAfter: number;
  completedAt: number | null;
  txHash: string;
}

export interface CreateEscrowRequest {
  orderId: string;
  driverWallet: string;
  amountWei: string;
}

export interface ReleasePayoutResult {
  orderId: string;
  driverWallet: string;
  amountWei: string;
  txHash: string;
  blockNumber: number;
}

// --- Partner SLA ---

export enum SLAContractStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export interface SLAContract {
  contractId: string;
  partnerAddress: string;
  deliveryTargetMinutes: number;
  penaltyPerBreachWei: string;
  bonusPerPerfectWeek: string;
  status: SLAContractStatus;
  createdAt: number;
  lastSettlementAt: number;
}

export interface CreateSLAContractRequest {
  contractId: string;
  partnerAddress: string;
  deliveryTargetMinutes: number;
  penaltyPerBreachWei: string;
  bonusPerPerfectWeek: string;
}

export interface SLAOutcome {
  contractId: string;
  orderId: string;
  actualMinutes: number;
  isBreach: boolean;
}

export interface WeeklySettlement {
  contractId: string;
  week: number;
  breaches: number;
  penaltyTotal: string;
  bonusAwarded: string;
  netSettlement: string;
}

// --- Driver Identity ---

export enum CredentialStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  SUSPENDED = 'SUSPENDED',
}

export interface DriverCredential {
  driverId: string;
  licenceHash: string;
  biometricHash: string;
  pdpHash: string;
  issuedAt: number;
  expiresAt: number;
  status: CredentialStatus;
  version: number;
  issuedBy: string;
}

export interface IssueCredentialRequest {
  driverId: string;
  licenceHash: string;
  biometricHash: string;
  pdpHash: string;
  validityDays: number;
}

export interface CredentialVerificationResult {
  driverId: string;
  valid: boolean;
  expiresAt: number;
  version: number;
}

// --- Transaction ---

export interface BlockchainTransaction {
  txHash: string;
  blockNumber: number;
  gasUsed: number;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
}

// --- Platform Stats ---

export interface BlockchainStats {
  totalDeliveries: number;
  disputedDeliveries: number;
  totalEscrowsCreated: number;
  totalPayoutsReleased: number;
  totalAmountReleasedWei: string;
  activeSLAContracts: number;
  totalCredentials: number;
  activeCredentials: number;
}
