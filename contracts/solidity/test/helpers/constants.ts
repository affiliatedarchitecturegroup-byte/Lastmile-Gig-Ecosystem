/**
 * Test Constants - Shared test data for smart contract tests.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 */

import { ethers } from 'hardhat';

// --- Order IDs ---
export const ORDER_ID_1 = ethers.encodeBytes32String('ORD-0001-UUID-ABCD');
export const ORDER_ID_2 = ethers.encodeBytes32String('ORD-0002-UUID-EFGH');
export const ORDER_ID_3 = ethers.encodeBytes32String('ORD-0003-UUID-IJKL');
export const ORDER_ID_4 = ethers.encodeBytes32String('ORD-0004-UUID-MNOP');

// --- Driver IDs ---
export const DRIVER_ID_1 = ethers.encodeBytes32String('DRV-0001-UUID-AAAA');
export const DRIVER_ID_2 = ethers.encodeBytes32String('DRV-0002-UUID-BBBB');
export const DRIVER_ID_3 = ethers.encodeBytes32String('DRV-0003-UUID-CCCC');

// --- Customer IDs ---
export const CUSTOMER_ID_1 = ethers.encodeBytes32String('CUS-0001-UUID-XXXX');
export const CUSTOMER_ID_2 = ethers.encodeBytes32String('CUS-0002-UUID-YYYY');

// --- Contract IDs ---
export const CONTRACT_ID_1 = ethers.encodeBytes32String('SLA-0001-UUID-AAAA');
export const CONTRACT_ID_2 = ethers.encodeBytes32String('SLA-0002-UUID-BBBB');

// --- GPS Coordinates (fixed point: GPS * 1e6) ---
// Durban CBD
export const LAT_DURBAN = -29858681n;
export const LNG_DURBAN = 31021839n;

// Umhlanga
export const LAT_UMHLANGA = -29728333n;
export const LNG_UMHLANGA = 31087222n;

// Invalid coordinates
export const LAT_INVALID = 91000000n;
export const LNG_INVALID = 181000000n;

// --- Photo / Document Hashes ---
export const PHOTO_HASH_1 = ethers.encodeBytes32String('QmPhotoHash1IPFS');
export const PHOTO_HASH_2 = ethers.encodeBytes32String('QmPhotoHash2IPFS');
export const SIGNATURE_HASH_1 = ethers.encodeBytes32String('SigHash1Delivery');
export const LICENCE_HASH_1 = ethers.encodeBytes32String('LicHash1Driver');
export const BIOMETRIC_HASH_1 = ethers.encodeBytes32String('BioHash1Template');
export const PDP_HASH_1 = ethers.encodeBytes32String('PDPHash1Permit');

// --- Zero Values ---
export const ZERO_BYTES32 = ethers.ZeroHash;
export const ZERO_ADDRESS = ethers.ZeroAddress;

// --- Time Constants ---
export const TEN_MINUTES = 10 * 60;
export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * 60 * 60;
export const ONE_WEEK = 7 * ONE_DAY;
export const THIRTY_DAYS = 30 * ONE_DAY;
export const ONE_YEAR = 365 * ONE_DAY;

// --- Escrow Amounts ---
export const ESCROW_AMOUNT_1 = ethers.parseEther('0.01');
export const ESCROW_AMOUNT_2 = ethers.parseEther('0.05');
export const ESCROW_AMOUNT_LARGE = ethers.parseEther('1.0');

// --- Role Hashes ---
export const RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('RECORDER_ROLE'));
export const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('VERIFIER_ROLE'));
export const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PAUSER_ROLE'));
export const PAYMENT_SERVICE_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PAYMENT_SERVICE_ROLE'));
export const RELEASE_ROLE = ethers.keccak256(ethers.toUtf8Bytes('RELEASE_ROLE'));
export const REFUND_ROLE = ethers.keccak256(ethers.toUtf8Bytes('REFUND_ROLE'));
export const SLA_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SLA_MANAGER_ROLE'));
export const SETTLEMENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SETTLEMENT_ROLE'));
export const IDENTITY_AUTHORITY_ROLE = ethers.keccak256(
  ethers.toUtf8Bytes('IDENTITY_AUTHORITY_ROLE'),
);
