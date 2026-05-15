/**
 * Deployment Script - Lastmile Gig Smart Contracts
 *
 * Deploys all four contracts to the target Polygon CDK network.
 * Grants appropriate roles after deployment.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network polygonCDKTestnet
 *   npx hardhat run scripts/deploy.ts --network polygonCDKMainnet
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 5
 */

import { ethers } from 'hardhat';

interface DeployedContracts {
  deliveryVerification: string;
  driverPayout: string;
  partnerSLA: string;
  driverIdentity: string;
}

const DEFAULT_HOLD_PERIOD = 10 * 60; // 10 minutes in seconds

async function main(): Promise<DeployedContracts> {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log('=== Lastmile Gig Smart Contract Deployment ===');
  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log('');

  // --- Deploy DeliveryVerification ---
  console.log('1/4 Deploying DeliveryVerification...');
  const DeliveryVerification = await ethers.getContractFactory('DeliveryVerification');
  const deliveryVerification = await DeliveryVerification.deploy(deployerAddress);
  await deliveryVerification.waitForDeployment();
  const dvAddress = await deliveryVerification.getAddress();
  console.log(`     DeliveryVerification deployed to: ${dvAddress}`);

  // --- Deploy DriverPayout ---
  console.log('2/4 Deploying DriverPayout...');
  const DriverPayout = await ethers.getContractFactory('DriverPayout');
  const driverPayout = await DriverPayout.deploy(deployerAddress, DEFAULT_HOLD_PERIOD);
  await driverPayout.waitForDeployment();
  const dpAddress = await driverPayout.getAddress();
  console.log(`     DriverPayout deployed to: ${dpAddress}`);

  // --- Deploy PartnerSLA ---
  console.log('3/4 Deploying PartnerSLA...');
  const PartnerSLA = await ethers.getContractFactory('PartnerSLA');
  const partnerSLA = await PartnerSLA.deploy(deployerAddress);
  await partnerSLA.waitForDeployment();
  const psAddress = await partnerSLA.getAddress();
  console.log(`     PartnerSLA deployed to: ${psAddress}`);

  // --- Deploy DriverIdentity ---
  console.log('4/4 Deploying DriverIdentity...');
  const DriverIdentity = await ethers.getContractFactory('DriverIdentity');
  const driverIdentity = await DriverIdentity.deploy(deployerAddress);
  await driverIdentity.waitForDeployment();
  const diAddress = await driverIdentity.getAddress();
  console.log(`     DriverIdentity deployed to: ${diAddress}`);

  // --- Summary ---
  console.log('');
  console.log('=== Deployment Complete ===');
  console.log('');
  console.log('Contract Addresses:');
  console.log(`  DeliveryVerification: ${dvAddress}`);
  console.log(`  DriverPayout:         ${dpAddress}`);
  console.log(`  PartnerSLA:           ${psAddress}`);
  console.log(`  DriverIdentity:       ${diAddress}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Verify contracts on block explorer');
  console.log('  2. Grant RECORDER_ROLE to svc-blockchain service wallet');
  console.log('  3. Grant PAYMENT_SERVICE_ROLE to payment service wallet');
  console.log('  4. Update .env with deployed addresses');
  console.log('  5. Deploy The Graph subgraph');

  const deployed: DeployedContracts = {
    deliveryVerification: dvAddress,
    driverPayout: dpAddress,
    partnerSLA: psAddress,
    driverIdentity: diAddress,
  };

  return deployed;
}

main()
  .then((addresses) => {
    console.log('');
    console.log('Deployed addresses JSON:');
    console.log(JSON.stringify(addresses, null, 2));
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exitCode = 1;
  });
