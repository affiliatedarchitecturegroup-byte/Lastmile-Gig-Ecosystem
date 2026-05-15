/**
 * The Graph Event Handlers - DeliveryVerification Contract
 *
 * Indexes delivery records and disputes from the Polygon CDK chain.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 4
 */

import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
  DeliveryRecorded as DeliveryRecordedEvent,
  DeliveryDisputed as DeliveryDisputedEvent,
  DeliveryDisputeResolved as DeliveryDisputeResolvedEvent,
} from '../generated/DeliveryVerification/DeliveryVerification';
import { DeliveryRecord, DeliveryDispute, PlatformStats } from '../generated/schema';

const PLATFORM_STATS_ID = 'platform-stats';

function getOrCreateStats(): PlatformStats {
  let stats = PlatformStats.load(PLATFORM_STATS_ID);
  if (stats == null) {
    stats = new PlatformStats(PLATFORM_STATS_ID);
    stats.totalDeliveries = BigInt.zero();
    stats.totalDisputes = BigInt.zero();
    stats.totalEscrows = BigInt.zero();
    stats.totalPayoutsReleased = BigInt.zero();
    stats.totalAmountReleased = BigInt.zero();
    stats.activeSLAContracts = BigInt.zero();
    stats.totalCredentials = BigInt.zero();
    stats.lastUpdated = BigInt.zero();
  }
  return stats;
}

export function handleDeliveryRecorded(event: DeliveryRecordedEvent): void {
  const id = event.transaction.hash.toHexString() + '-' + event.logIndex.toString();

  const record = new DeliveryRecord(id);
  record.orderId = event.params.orderId;
  record.driverId = event.params.driverId;
  record.customerId = event.params.customerId;
  record.deliveryLat = BigInt.zero(); // Not indexed in event
  record.deliveryLng = BigInt.zero();
  record.timestamp = event.params.timestamp;
  record.photoHash = event.params.photoHash;
  record.signatureHash = Bytes.empty();
  record.verified = true;
  record.disputed = false;
  record.blockNumber = event.block.number;
  record.transactionHash = event.transaction.hash;
  record.recorder = event.transaction.from;
  record.save();

  // Update platform stats
  const stats = getOrCreateStats();
  stats.totalDeliveries = stats.totalDeliveries.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleDeliveryDisputed(event: DeliveryDisputedEvent): void {
  const id = event.transaction.hash.toHexString() + '-' + event.logIndex.toString();

  const dispute = new DeliveryDispute(id);
  dispute.orderId = event.params.orderId;
  dispute.disputedBy = event.params.disputedBy;
  dispute.timestamp = event.params.timestamp;
  dispute.resolved = false;
  dispute.blockNumber = event.block.number;
  dispute.transactionHash = event.transaction.hash;
  dispute.save();

  // Update platform stats
  const stats = getOrCreateStats();
  stats.totalDisputes = stats.totalDisputes.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleDeliveryDisputeResolved(event: DeliveryDisputeResolvedEvent): void {
  // Find the dispute by orderId and update it
  const disputes = DeliveryDispute.load(event.params.orderId.toHexString());
  if (disputes != null) {
    disputes.resolved = true;
    disputes.resolvedVerified = event.params.verified;
    disputes.resolvedBy = event.params.resolvedBy;
    disputes.resolvedTimestamp = event.params.timestamp;
    disputes.save();
  }

  // Update platform stats
  const stats = getOrCreateStats();
  stats.totalDisputes = stats.totalDisputes.minus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}
