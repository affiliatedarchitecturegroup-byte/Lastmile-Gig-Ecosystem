/**
 * Smart Contract Deployment Script
 * @module contracts/scripts/deploy
 * @description Deploys all Lastmile Gig smart contracts to Polygon CDK
 * @phase P225 - Smart Contract Testnet Deployment
 */

import { ethers } from 'hardhat';

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log('='.repeat(60));
  console.log('Lastmile Gig - Smart Contract Deployment');
  console.log('='.repeat(60));
  console.log(`Network: ${network.name} (chainId: ${String(network.chainId)})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log('-'.repeat(60));

  // Deploy DeliveryVerification
  console.log('\n1. Deploying DeliveryVerification...');
  const DeliveryVerification = await ethers.getContractFactory('DeliveryVerification');
  const deliveryVerification = await DeliveryVerification.deploy(deployer.address);
  await deliveryVerification.waitForDeployment();
  const dvAddress = await deliveryVerification.getAddress();
  console.log(`   DeliveryVerification deployed: ${dvAddress}`);

  // Deploy DriverPayout
  console.log('\n2. Deploying DriverPayout...');
  const DriverPayout = await ethers.getContractFactory('DriverPayout');
  const driverPayout = await DriverPayout.deploy(deployer.address);
  await driverPayout.waitForDeployment();
  const dpAddress = await driverPayout.getAddress();
  console.log(`   DriverPayout deployed: ${dpAddress}`);

  // Deploy PartnerSLA
  console.log('\n3. Deploying PartnerSLA...');
  const PartnerSLA = await ethers.getContractFactory('PartnerSLA');
  const partnerSLA = await PartnerSLA.deploy(deployer.address);
  await partnerSLA.waitForDeployment();
  const slaAddress = await partnerSLA.getAddress();
  console.log(`   PartnerSLA deployed: ${slaAddress}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Deployment Complete');
  console.log('='.repeat(60));
  console.log(`DeliveryVerification: ${dvAddress}`);
  console.log(`DriverPayout:         ${dpAddress}`);
  console.log(`PartnerSLA:           ${slaAddress}`);
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
