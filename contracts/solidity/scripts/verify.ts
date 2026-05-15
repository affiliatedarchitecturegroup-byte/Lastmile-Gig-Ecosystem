/**
 * Contract Verification Script - Verify deployed contracts on block explorer.
 *
 * Verifies all four contracts after deployment so their source code
 * is publicly readable on the Polygon CDK block explorer.
 *
 * Usage:
 *   npx hardhat run scripts/verify.ts --network polygonCDKTestnet
 *
 * Prerequisites:
 *   - Contracts must be deployed (addresses in .env)
 *   - ETHERSCAN_API_KEY must be set
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 5
 */

import { run } from 'hardhat';

interface ContractVerification {
  name: string;
  address: string;
  constructorArgs: unknown[];
}

async function main(): Promise<void> {
  console.log('=== Lastmile Gig Contract Verification ===');
  console.log('');

  const deployerAddress = process.env.DEPLOYER_ADDRESS ?? '';
  const holdPeriod = 10 * 60; // 10 minutes

  if (!deployerAddress) {
    console.error('DEPLOYER_ADDRESS not set in environment');
    process.exitCode = 1;
    return;
  }

  const contracts: ContractVerification[] = [
    {
      name: 'DeliveryVerification',
      address: process.env.DELIVERY_VERIFICATION_ADDRESS ?? '',
      constructorArgs: [deployerAddress],
    },
    {
      name: 'DriverPayout',
      address: process.env.DRIVER_PAYOUT_ADDRESS ?? '',
      constructorArgs: [deployerAddress, holdPeriod],
    },
    {
      name: 'PartnerSLA',
      address: process.env.PARTNER_SLA_ADDRESS ?? '',
      constructorArgs: [deployerAddress],
    },
    {
      name: 'DriverIdentity',
      address: process.env.DRIVER_IDENTITY_ADDRESS ?? '',
      constructorArgs: [deployerAddress],
    },
  ];

  for (const contract of contracts) {
    if (!contract.address) {
      console.log(`Skipping ${contract.name}: address not configured`);
      continue;
    }

    console.log(`Verifying ${contract.name} at ${contract.address}...`);

    try {
      await run('verify:verify', {
        address: contract.address,
        constructorArguments: contract.constructorArgs,
      });
      console.log(`  ${contract.name} verified successfully`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Already Verified')) {
        console.log(`  ${contract.name} already verified`);
      } else {
        console.error(`  ${contract.name} verification failed: ${errorMessage}`);
      }
    }
  }

  console.log('');
  console.log('Verification complete');
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error('Verification script failed:', error);
    process.exitCode = 1;
  });
