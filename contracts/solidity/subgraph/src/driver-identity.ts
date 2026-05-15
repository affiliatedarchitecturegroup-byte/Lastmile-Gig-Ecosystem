/**
 * The Graph Event Handlers - DriverIdentity Contract
 *
 * Indexes credential issuance and revocations.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 4
 */

import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
  CredentialIssued as CredentialIssuedEvent,
  CredentialRevoked as CredentialRevokedEvent,
} from '../generated/DriverIdentity/DriverIdentity';
import { DriverCredential, CredentialRevocation, PlatformStats } from '../generated/schema';

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

export function handleCredentialIssued(event: CredentialIssuedEvent): void {
  const id = event.params.driverId.toHexString();

  const credential = new DriverCredential(id);
  credential.driverId = event.params.driverId;
  credential.licenceHash = event.params.licenceHash;
  credential.issuedAt = event.params.issuedAt;
  credential.expiresAt = event.params.expiresAt;
  credential.version = event.params.version;
  credential.status = 'ACTIVE';
  credential.issuedBy = event.transaction.from;
  credential.blockNumber = event.block.number;
  credential.transactionHash = event.transaction.hash;
  credential.save();

  const stats = getOrCreateStats();
  stats.totalCredentials = stats.totalCredentials.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleCredentialRevoked(event: CredentialRevokedEvent): void {
  const credId = event.params.driverId.toHexString();
  const revocationId =
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString();

  // Update credential status
  const credential = DriverCredential.load(credId);
  if (credential != null) {
    credential.status = 'REVOKED';
    credential.save();
  }

  // Create revocation record
  const revocation = new CredentialRevocation(revocationId);
  revocation.credential = credId;
  revocation.driverId = event.params.driverId;
  revocation.reason = event.params.reason;
  revocation.revokedAt = event.params.timestamp;
  revocation.revokedBy = event.params.revokedBy;
  revocation.blockNumber = event.block.number;
  revocation.transactionHash = event.transaction.hash;
  revocation.save();
}
