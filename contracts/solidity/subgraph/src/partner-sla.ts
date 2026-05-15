/**
 * The Graph Event Handlers - PartnerSLA Contract
 *
 * Indexes SLA contract lifecycle, breaches, successes, and settlements.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 4
 */

import { BigInt } from '@graphprotocol/graph-ts';
import {
  SLAContractCreated as SLAContractCreatedEvent,
  SLABreachRecorded as SLABreachRecordedEvent,
  SLASuccessRecorded as SLASuccessRecordedEvent,
  WeeklySettlementExecuted as WeeklySettlementExecutedEvent,
} from '../generated/PartnerSLA/PartnerSLA';
import {
  SLAContract,
  SLABreach,
  SLASuccess,
  WeeklySettlement,
  PlatformStats,
} from '../generated/schema';

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

export function handleSLAContractCreated(event: SLAContractCreatedEvent): void {
  const id = event.params.contractId.toHexString();

  const contract = new SLAContract(id);
  contract.contractId = event.params.contractId;
  contract.partnerAddress = event.params.partner;
  contract.deliveryTargetMinutes = event.params.targetMinutes;
  contract.penaltyPerBreachWei = event.params.penaltyWei;
  contract.bonusPerPerfectWeek = event.params.bonusWei;
  contract.status = 'ACTIVE';
  contract.createdAt = event.block.timestamp;
  contract.blockNumber = event.block.number;
  contract.transactionHash = event.transaction.hash;
  contract.save();

  const stats = getOrCreateStats();
  stats.activeSLAContracts = stats.activeSLAContracts.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleSLABreachRecorded(event: SLABreachRecordedEvent): void {
  const id = event.transaction.hash.toHexString() + '-' + event.logIndex.toString();
  const contractId = event.params.contractId.toHexString();

  const breach = new SLABreach(id);
  breach.contract = contractId;
  breach.orderId = event.params.orderId;
  breach.actualMinutes = event.params.actualMinutes;
  breach.targetMinutes = event.params.targetMinutes;
  breach.week = event.params.week;
  breach.timestamp = event.block.timestamp;
  breach.blockNumber = event.block.number;
  breach.transactionHash = event.transaction.hash;
  breach.save();
}

export function handleSLASuccessRecorded(event: SLASuccessRecordedEvent): void {
  const id = event.transaction.hash.toHexString() + '-' + event.logIndex.toString();
  const contractId = event.params.contractId.toHexString();

  const success = new SLASuccess(id);
  success.contract = contractId;
  success.orderId = event.params.orderId;
  success.actualMinutes = event.params.actualMinutes;
  success.week = event.params.week;
  success.timestamp = event.block.timestamp;
  success.blockNumber = event.block.number;
  success.transactionHash = event.transaction.hash;
  success.save();
}

export function handleWeeklySettlement(event: WeeklySettlementExecutedEvent): void {
  const id = event.transaction.hash.toHexString() + '-' + event.logIndex.toString();
  const contractId = event.params.contractId.toHexString();

  const settlement = new WeeklySettlement(id);
  settlement.contract = contractId;
  settlement.week = event.params.week;
  settlement.breachCount = event.params.breaches;
  settlement.penaltyTotal = event.params.penaltyTotal;
  settlement.bonusAwarded = event.params.bonusAwarded;
  settlement.netSettlement = event.params.netSettlement;
  settlement.timestamp = event.block.timestamp;
  settlement.blockNumber = event.block.number;
  settlement.transactionHash = event.transaction.hash;
  settlement.save();
}
