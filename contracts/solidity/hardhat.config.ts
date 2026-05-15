/**
 * Hardhat Configuration - Lastmile Gig Smart Contracts
 *
 * Polygon CDK Layer 2 deployment for delivery verification,
 * driver payouts, partner SLA enforcement, and driver identity.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 */

import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '';
const POLYGON_CDK_TESTNET_RPC = process.env.POLYGON_CDK_TESTNET_RPC ?? 'http://localhost:8545';
const POLYGON_CDK_MAINNET_RPC = process.env.POLYGON_CDK_MAINNET_RPC ?? '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? '';
const REPORT_GAS = process.env.REPORT_GAS === 'true';
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY ?? '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: 'paris',
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
    },
    polygonCDKTestnet: {
      url: POLYGON_CDK_TESTNET_RPC,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 1442,
      gasPrice: 'auto',
    },
    polygonCDKMainnet: {
      url: POLYGON_CDK_MAINNET_RPC,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 1101,
      gasPrice: 'auto',
    },
  },
  gasReporter: {
    enabled: REPORT_GAS,
    currency: 'ZAR',
    coinmarketcap: COINMARKETCAP_API_KEY,
    outputFile: 'gas-report.txt',
    noColors: true,
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;
