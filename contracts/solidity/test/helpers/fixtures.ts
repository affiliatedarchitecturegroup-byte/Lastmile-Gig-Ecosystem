/**
 * Test Fixtures - Reusable deployment fixtures for smart contract tests.
 *
 * Uses Hardhat's loadFixture pattern for clean test state isolation.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 */

import { ethers } from 'hardhat';
import { TEN_MINUTES } from './constants';

/**
 * Deploy DeliveryVerification contract fixture.
 */
export async function deployDeliveryVerificationFixture() {
  const [admin, recorder, verifier, pauser, unauthorized] = await ethers.getSigners();

  const DeliveryVerification = await ethers.getContractFactory('DeliveryVerification');
  const contract = await DeliveryVerification.deploy(admin.address);
  await contract.waitForDeployment();

  // Grant roles
  const RECORDER_ROLE = await contract.RECORDER_ROLE();
  const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
  const PAUSER_ROLE = await contract.PAUSER_ROLE();

  await contract.grantRole(RECORDER_ROLE, recorder.address);
  await contract.grantRole(VERIFIER_ROLE, verifier.address);
  await contract.grantRole(PAUSER_ROLE, pauser.address);

  return {
    contract,
    admin,
    recorder,
    verifier,
    pauser,
    unauthorized,
    roles: { RECORDER_ROLE, VERIFIER_ROLE, PAUSER_ROLE },
  };
}

/**
 * Deploy DriverPayout contract fixture.
 */
export async function deployDriverPayoutFixture() {
  const [admin, paymentService, releaser, refunder, pauser, driverWallet, unauthorized] =
    await ethers.getSigners();

  const DriverPayout = await ethers.getContractFactory('DriverPayout');
  const contract = await DriverPayout.deploy(admin.address, TEN_MINUTES);
  await contract.waitForDeployment();

  // Grant roles
  const PAYMENT_SERVICE_ROLE = await contract.PAYMENT_SERVICE_ROLE();
  const RELEASE_ROLE = await contract.RELEASE_ROLE();
  const REFUND_ROLE = await contract.REFUND_ROLE();
  const PAUSER_ROLE = await contract.PAUSER_ROLE();

  await contract.grantRole(PAYMENT_SERVICE_ROLE, paymentService.address);
  await contract.grantRole(RELEASE_ROLE, releaser.address);
  await contract.grantRole(REFUND_ROLE, refunder.address);
  await contract.grantRole(PAUSER_ROLE, pauser.address);

  return {
    contract,
    admin,
    paymentService,
    releaser,
    refunder,
    pauser,
    driverWallet,
    unauthorized,
    roles: { PAYMENT_SERVICE_ROLE, RELEASE_ROLE, REFUND_ROLE, PAUSER_ROLE },
  };
}

/**
 * Deploy PartnerSLA contract fixture.
 */
export async function deployPartnerSLAFixture() {
  const [admin, slaManager, recorder, settler, pauser, partner, unauthorized] =
    await ethers.getSigners();

  const PartnerSLA = await ethers.getContractFactory('PartnerSLA');
  const contract = await PartnerSLA.deploy(admin.address);
  await contract.waitForDeployment();

  // Grant roles
  const SLA_MANAGER_ROLE = await contract.SLA_MANAGER_ROLE();
  const RECORDER_ROLE = await contract.RECORDER_ROLE();
  const SETTLEMENT_ROLE = await contract.SETTLEMENT_ROLE();
  const PAUSER_ROLE = await contract.PAUSER_ROLE();

  await contract.grantRole(SLA_MANAGER_ROLE, slaManager.address);
  await contract.grantRole(RECORDER_ROLE, recorder.address);
  await contract.grantRole(SETTLEMENT_ROLE, settler.address);
  await contract.grantRole(PAUSER_ROLE, pauser.address);

  return {
    contract,
    admin,
    slaManager,
    recorder,
    settler,
    pauser,
    partner,
    unauthorized,
    roles: { SLA_MANAGER_ROLE, RECORDER_ROLE, SETTLEMENT_ROLE, PAUSER_ROLE },
  };
}

/**
 * Deploy DriverIdentity contract fixture.
 */
export async function deployDriverIdentityFixture() {
  const [admin, authority, verifier, pauser, unauthorized] = await ethers.getSigners();

  const DriverIdentity = await ethers.getContractFactory('DriverIdentity');
  const contract = await DriverIdentity.deploy(admin.address);
  await contract.waitForDeployment();

  // Grant roles
  const IDENTITY_AUTHORITY_ROLE = await contract.IDENTITY_AUTHORITY_ROLE();
  const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
  const PAUSER_ROLE = await contract.PAUSER_ROLE();

  await contract.grantRole(IDENTITY_AUTHORITY_ROLE, authority.address);
  await contract.grantRole(VERIFIER_ROLE, verifier.address);
  await contract.grantRole(PAUSER_ROLE, pauser.address);

  return {
    contract,
    admin,
    authority,
    verifier,
    pauser,
    unauthorized,
    roles: { IDENTITY_AUTHORITY_ROLE, VERIFIER_ROLE, PAUSER_ROLE },
  };
}
