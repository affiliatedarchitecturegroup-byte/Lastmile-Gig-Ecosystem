/**
 * Hardhat Configuration
 * @module contracts/hardhat.config
 * @description Configuration for Lastmile Gig smart contract development
 * @phase P221 - Smart Contract Hardhat Setup
 */

import type { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'paris',
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // Polygon CDK Testnet
    polygonCdkTestnet: {
      url: process.env.LMG_POLYGON_CDK_TESTNET_RPC ?? '',
      accounts: process.env.LMG_DEPLOYER_PRIVATE_KEY
        ? [process.env.LMG_DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 2442,
    },
    // Polygon CDK Mainnet
    polygonCdkMainnet: {
      url: process.env.LMG_POLYGON_CDK_MAINNET_RPC ?? '',
      accounts: process.env.LMG_DEPLOYER_PRIVATE_KEY
        ? [process.env.LMG_DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 1101,
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
