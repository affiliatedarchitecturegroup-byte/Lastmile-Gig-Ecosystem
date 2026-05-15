/**
 * The Graph Event Handlers - DriverPayout Contract
 *
 * Indexes escrow creation, payout releases, and refunds.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 4
 */

import { BigInt } from '@graphprotocol/graph-ts';
import {
  EscrowCreated as EscrowCreatedEvent,
  PayoutReleased as PayoutReleasedEvent,
  PayoutRefunded as PayoutRefundedEvent,
} from '../generated/DriverPayout/DriverPayout';
import { PayoutEscrow, PayoutRelease, PayoutRefund, PlatformStats } from '../generated/schema';

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

export function handleEscrowCreated(event: EscrowCreatedEvent): void {
  const id = event.transaction.hash.toHexString() + '-' + event.logIndex.toString();

  const escrow = new PayoutEscrow(id);
  escrow.orderId = event.params.orderId;
  escrow.driverWallet = event.params.driverWallet;
  escrow.amount = event.params.amount;
  escrow.releaseAfter = event.params.releaseAfter;
  escrow.status = 'CREATED';
  escrow.createdAt = event.block.timestamp;
  escrow.blockNumber = event.block.number;
  escrow.transactionHash = event.transaction.hash;
  escrow.save();

  const stats = getOrCreateStats();
  stats.totalEscrows = stats.totalEscrows.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handlePayoutReleased(event: PayoutReleasedEvent): void {
  const id = event.transaction.hash.toHexString() + '-' + event.logIndex.toString();

  const release = new PayoutRelease(id);
  release.orderId = event.params.orderId;
  release.driverWallet = event.params.driver;
  release.amount = event.params.amount;
  release.timestamp = event.params.timestamp;
  release.blockNumber = event.block.number;
  release.transactionHash = event.transaction.hash;
  release.save();

  const stats = getOrCreateStats();
  stats.totalPayoutsReleased = stats.totalPayoutsReleased.plus(BigInt.fromI32(1));
  stats.totalAmountReleased = stats.totalAmountReleased.plus(event.params.amount);
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handlePayoutRefunded(event: PayoutRefundedEvent): void {
  const id = event.transaction.hash.toHexString() + '-' + event.logIndex.toString();

  const refund = new PayoutRefund(id);
  refund.orderId = event.params.orderId;
  refund.driverWallet = event.params.driverWallet;
  refund.amount = event.params.amount;
  refund.reason = event.params.reason;
  refund.blockNumber = event.block.number;
  refund.transactionHash = event.transaction.hash;
  refund.save();
}
