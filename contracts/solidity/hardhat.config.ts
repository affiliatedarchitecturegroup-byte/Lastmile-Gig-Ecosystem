/**
 * Hardhat Configuration for Lastmile Gig Smart Contracts.
 *
 * Deploys to Polygon CDK L2 network.
 * Contracts: DeliveryVerification, DriverPayout, PartnerSLA.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 */

import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    polygonCDKTestnet: {
      url: process.env.LMG_POLYGON_CDK_TESTNET_RPC ?? 'https://rpc.cardona.zkevm-rpc.com',
      accounts: process.env.LMG_DEPLOYER_PRIVATE_KEY
        ? [process.env.LMG_DEPLOYER_PRIVATE_KEY]
        : [],
    },
    polygonCDKMainnet: {
      url: process.env.LMG_POLYGON_CDK_MAINNET_RPC ?? 'https://zkevm-rpc.com',
      accounts: process.env.LMG_DEPLOYER_PRIVATE_KEY
        ? [process.env.LMG_DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

export default config;
