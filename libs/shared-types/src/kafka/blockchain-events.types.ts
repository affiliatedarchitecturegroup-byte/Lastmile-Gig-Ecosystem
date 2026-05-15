/**
 * Kafka event types for blockchain and IoT events.
 *
 * Extends the base event schema with blockchain-specific and
 * IoT-specific event payloads.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 3.1
 */

import type { KafkaEvent } from './kafka-events.types';

// --- Blockchain Events ---

export interface DeliveryRecordedOnChainEvent
  extends KafkaEvent<{
    orderId: string;
    driverId: string;
    txHash: string;
    blockNumber: number;
    photoHash: string;
    timestamp: number;
  }> {
  eventType: 'blockchain.delivery.recorded';
}

export interface EscrowCreatedOnChainEvent
  extends KafkaEvent<{
    orderId: string;
    driverWallet: string;
    amountWei: string;
    txHash: string;
    releaseAfter: number;
  }> {
  eventType: 'blockchain.escrow.created';
}

export interface PayoutReleasedOnChainEvent
  extends KafkaEvent<{
    orderId: string;
    driverWallet: string;
    amountWei: string;
    txHash: string;
  }> {
  eventType: 'blockchain.payout.released';
}

export interface SLABreachOnChainEvent
  extends KafkaEvent<{
    contractId: string;
    orderId: string;
    actualMinutes: number;
    targetMinutes: number;
    txHash: string;
  }> {
  eventType: 'blockchain.sla.breach';
}

export interface SLASettlementOnChainEvent
  extends KafkaEvent<{
    contractId: string;
    week: number;
    breaches: number;
    penaltyTotal: string;
    bonusAwarded: string;
    netSettlement: string;
    txHash: string;
  }> {
  eventType: 'blockchain.sla.settlement';
}

export interface CredentialIssuedOnChainEvent
  extends KafkaEvent<{
    driverId: string;
    txHash: string;
    expiresAt: number;
    version: number;
  }> {
  eventType: 'blockchain.credential.issued';
}

export interface CredentialRevokedOnChainEvent
  extends KafkaEvent<{
    driverId: string;
    reason: string;
    txHash: string;
  }> {
  eventType: 'blockchain.credential.revoked';
}

// --- IoT Events ---

export interface IoTTelemetryEvent
  extends KafkaEvent<{
    vehicleId: string;
    latitude: number;
    longitude: number;
    speedKmh: number;
    engineTempC: number;
    batteryPct: number | null;
    fuelLevelPct: number | null;
    odometerKm: number;
    rpm: number;
    errorCodes: string[];
  }> {
  eventType: 'iot.telemetry';
}

export interface IoTMaintenanceAlertEvent
  extends KafkaEvent<{
    vehicleId: string;
    alertType: string;
    severity: string;
    message: string;
    value: number;
    threshold: number;
  }> {
  eventType: 'iot.maintenance.alert';
}

export interface IoTGeofenceViolationEvent
  extends KafkaEvent<{
    vehicleId: string;
    geofenceId: string;
    geofenceName: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
  }> {
  eventType: 'iot.geofence.violation';
}

// --- Extended Kafka Topic Constants ---

export const BLOCKCHAIN_KAFKA_TOPICS = {
  DELIVERY_RECORDED: 'lmg.blockchain.delivery.recorded',
  ESCROW_CREATED: 'lmg.blockchain.escrow.created',
  PAYOUT_RELEASED: 'lmg.blockchain.payout.released',
  SLA_BREACH: 'lmg.blockchain.sla.breach',
  SLA_SETTLEMENT: 'lmg.blockchain.sla.settlement',
  CREDENTIAL_ISSUED: 'lmg.blockchain.credential.issued',
  CREDENTIAL_REVOKED: 'lmg.blockchain.credential.revoked',
  IOT_TELEMETRY: 'lmg.iot.telemetry',
  IOT_MAINTENANCE_ALERT: 'lmg.iot.maintenance.alert',
  IOT_GEOFENCE_VIOLATION: 'lmg.iot.geofence.violation',
} as const;
