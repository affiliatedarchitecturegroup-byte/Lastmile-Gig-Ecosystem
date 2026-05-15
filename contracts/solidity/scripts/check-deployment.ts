/**
 * Deployment Health Check Script - Verify deployed contracts are functional.
 *
 * Runs after deployment to confirm all contracts respond correctly
 * and have proper role configuration.
 *
 * Usage:
 *   npx hardhat run scripts/check-deployment.ts --network polygonCDKTestnet
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 */

import { ethers } from 'hardhat';

interface CheckResult {
  contract: string;
  check: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  detail: string;
}

async function main(): Promise<void> {
  console.log('=== Deployment Health Check ===');
  console.log('');

  const results: CheckResult[] = [];
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log('');

  // Contract addresses from environment
  const addresses: Record<string, string> = {
    DeliveryVerification: process.env.DELIVERY_VERIFICATION_ADDRESS ?? '',
    DriverPayout: process.env.DRIVER_PAYOUT_ADDRESS ?? '',
    PartnerSLA: process.env.PARTNER_SLA_ADDRESS ?? '',
    DriverIdentity: process.env.DRIVER_IDENTITY_ADDRESS ?? '',
  };

  for (const [name, address] of Object.entries(addresses)) {
    if (!address) {
      results.push({
        contract: name,
        check: 'address-configured',
        status: 'SKIP',
        detail: 'Address not configured in environment',
      });
      continue;
    }

    // Check code exists at address
    const code = await ethers.provider.getCode(address);
    const hasCode = code !== '0x';

    results.push({
      contract: name,
      check: 'contract-deployed',
      status: hasCode ? 'PASS' : 'FAIL',
      detail: hasCode
        ? `Code found at ${address}`
        : `No code at ${address}`,
    });

    if (!hasCode) continue;

    // Try calling a view function
    try {
      const contract = await ethers.getContractAt(name, address);

      if (name === 'DeliveryVerification') {
        const stats = await contract.getStats();
        results.push({
          contract: name,
          check: 'view-function',
          status: 'PASS',
          detail: `getStats() returned: total=${stats[0]}, disputed=${stats[1]}`,
        });
      }

      if (name === 'DriverPayout') {
        const holdPeriod = await contract.getHoldPeriod();
        results.push({
          contract: name,
          check: 'view-function',
          status: 'PASS',
          detail: `Hold period: ${holdPeriod}s`,
        });
      }

      if (name === 'PartnerSLA') {
        const activeCount = await contract.getActiveContractCount();
        results.push({
          contract: name,
          check: 'view-function',
          status: 'PASS',
          detail: `Active contracts: ${activeCount}`,
        });
      }

      if (name === 'DriverIdentity') {
        const stats = await contract.getStats();
        results.push({
          contract: name,
          check: 'view-function',
          status: 'PASS',
          detail: `Credentials: total=${stats[0]}, active=${stats[1]}, revoked=${stats[2]}`,
        });
      }

      // Check admin role
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      const [deployer] = await ethers.getSigners();
      const isAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);

      results.push({
        contract: name,
        check: 'admin-role',
        status: isAdmin ? 'PASS' : 'FAIL',
        detail: isAdmin
          ? `Deployer has admin role`
          : `Deployer lacks admin role`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        contract: name,
        check: 'view-function',
        status: 'FAIL',
        detail: `Error: ${errorMessage.substring(0, 80)}`,
      });
    }
  }

  // Print results
  console.log('Results:');
  console.log('-'.repeat(80));

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const r of results) {
    const statusIcon = r.status === 'PASS' ? 'OK' : r.status === 'FAIL' ? 'FAIL' : 'SKIP';
    console.log(`  [${statusIcon}] ${r.contract}.${r.check}: ${r.detail}`);

    if (r.status === 'PASS') passCount++;
    else if (r.status === 'FAIL') failCount++;
    else skipCount++;
  }

  console.log('-'.repeat(80));
  console.log(`Total: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Health check failed:', error);
  process.exitCode = 1;
});
