/**
 * Role Grant Script - Configure access control roles after deployment.
 *
 * Grants the correct roles to service wallets after contract deployment.
 * Each service (svc-blockchain, svc-payments) gets specific roles
 * on the contracts it needs to interact with.
 *
 * Usage:
 *   npx hardhat run scripts/grant-roles.ts --network polygonCDKTestnet
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 2
 */

import { ethers } from 'hardhat';

interface RoleGrant {
  contract: string;
  contractAddress: string;
  roleName: string;
  roleHash: string;
  grantee: string;
  granteeName: string;
}

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  console.log('=== Lastmile Gig Role Configuration ===');
  console.log(`Deployer: ${await deployer.getAddress()}`);
  console.log('');

  // Service wallet addresses (from Vault / environment)
  const blockchainServiceWallet = process.env.BLOCKCHAIN_SERVICE_WALLET ?? '';
  const paymentServiceWallet = process.env.PAYMENT_SERVICE_WALLET ?? '';
  const opsVerifierWallet = process.env.OPS_VERIFIER_WALLET ?? '';
  const identityAuthorityWallet = process.env.IDENTITY_AUTHORITY_WALLET ?? '';

  // Contract addresses
  const dvAddress = process.env.DELIVERY_VERIFICATION_ADDRESS ?? '';
  const dpAddress = process.env.DRIVER_PAYOUT_ADDRESS ?? '';
  const psAddress = process.env.PARTNER_SLA_ADDRESS ?? '';
  const diAddress = process.env.DRIVER_IDENTITY_ADDRESS ?? '';

  // Role hashes
  const RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('RECORDER_ROLE'));
  const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('VERIFIER_ROLE'));
  const PAYMENT_SERVICE_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PAYMENT_SERVICE_ROLE'));
  const RELEASE_ROLE = ethers.keccak256(ethers.toUtf8Bytes('RELEASE_ROLE'));
  const SLA_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SLA_MANAGER_ROLE'));
  const SETTLEMENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SETTLEMENT_ROLE'));
  const IDENTITY_AUTHORITY_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes('IDENTITY_AUTHORITY_ROLE'),
  );

  const roleGrants: RoleGrant[] = [
    // DeliveryVerification roles
    {
      contract: 'DeliveryVerification',
      contractAddress: dvAddress,
      roleName: 'RECORDER_ROLE',
      roleHash: RECORDER_ROLE,
      grantee: blockchainServiceWallet,
      granteeName: 'svc-blockchain',
    },
    {
      contract: 'DeliveryVerification',
      contractAddress: dvAddress,
      roleName: 'VERIFIER_ROLE',
      roleHash: VERIFIER_ROLE,
      grantee: opsVerifierWallet,
      granteeName: 'ops-verifier',
    },
    // DriverPayout roles
    {
      contract: 'DriverPayout',
      contractAddress: dpAddress,
      roleName: 'PAYMENT_SERVICE_ROLE',
      roleHash: PAYMENT_SERVICE_ROLE,
      grantee: paymentServiceWallet,
      granteeName: 'svc-payments',
    },
    {
      contract: 'DriverPayout',
      contractAddress: dpAddress,
      roleName: 'RELEASE_ROLE',
      roleHash: RELEASE_ROLE,
      grantee: blockchainServiceWallet,
      granteeName: 'svc-blockchain',
    },
    // PartnerSLA roles
    {
      contract: 'PartnerSLA',
      contractAddress: psAddress,
      roleName: 'SLA_MANAGER_ROLE',
      roleHash: SLA_MANAGER_ROLE,
      grantee: blockchainServiceWallet,
      granteeName: 'svc-blockchain',
    },
    {
      contract: 'PartnerSLA',
      contractAddress: psAddress,
      roleName: 'RECORDER_ROLE',
      roleHash: RECORDER_ROLE,
      grantee: blockchainServiceWallet,
      granteeName: 'svc-blockchain',
    },
    {
      contract: 'PartnerSLA',
      contractAddress: psAddress,
      roleName: 'SETTLEMENT_ROLE',
      roleHash: SETTLEMENT_ROLE,
      grantee: blockchainServiceWallet,
      granteeName: 'svc-blockchain',
    },
    // DriverIdentity roles
    {
      contract: 'DriverIdentity',
      contractAddress: diAddress,
      roleName: 'IDENTITY_AUTHORITY_ROLE',
      roleHash: IDENTITY_AUTHORITY_ROLE,
      grantee: identityAuthorityWallet,
      granteeName: 'identity-authority',
    },
  ];

  let granted = 0;
  let skipped = 0;

  for (const grant of roleGrants) {
    if (!grant.contractAddress || !grant.grantee) {
      console.log(
        `  SKIP: ${grant.contract}.${grant.roleName} -> ${grant.granteeName} (address not configured)`,
      );
      skipped++;
      continue;
    }

    try {
      const contract = await ethers.getContractAt(grant.contract, grant.contractAddress);
      const hasRole = await contract.hasRole(grant.roleHash, grant.grantee);

      if (hasRole) {
        console.log(
          `  EXISTING: ${grant.contract}.${grant.roleName} -> ${grant.granteeName}`,
        );
        skipped++;
        continue;
      }

      const tx = await contract.grantRole(grant.roleHash, grant.grantee);
      await tx.wait();

      console.log(
        `  GRANTED: ${grant.contract}.${grant.roleName} -> ${grant.granteeName} (tx: ${tx.hash})`,
      );
      granted++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `  ERROR: ${grant.contract}.${grant.roleName} -> ${grant.granteeName}: ${errorMessage}`,
      );
    }
  }

  console.log('');
  console.log(`Role configuration complete: ${granted} granted, ${skipped} skipped`);
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error('Role grant script failed:', error);
    process.exitCode = 1;
  });
