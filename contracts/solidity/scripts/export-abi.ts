/**
 * ABI Export Script - Extract and export contract ABIs for service integration.
 *
 * Extracts ABI JSON from compiled artifacts and writes them to a shared
 * directory that svc-blockchain (Rust) and The Graph subgraph can consume.
 *
 * Usage:
 *   npx hardhat compile
 *   npx hardhat run scripts/export-abi.ts
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 3
 */

import * as fs from 'fs';
import * as path from 'path';

interface ArtifactFile {
  contractName: string;
  abi: unknown[];
  bytecode: string;
}

const CONTRACTS = [
  'DeliveryVerification',
  'DriverPayout',
  'PartnerSLA',
  'DriverIdentity',
];

const ARTIFACTS_DIR = path.join(__dirname, '..', 'artifacts', 'contracts');
const ABI_OUTPUT_DIR = path.join(__dirname, '..', 'abi');
const RUST_ABI_DIR = path.join(__dirname, '..', '..', '..', 'apps', 'svc-blockchain', 'abi');

async function main(): Promise<void> {
  console.log('=== ABI Export ===');
  console.log('');

  // Create output directories
  for (const dir of [ABI_OUTPUT_DIR, RUST_ABI_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }

  for (const contractName of CONTRACTS) {
    const artifactPath = path.join(
      ARTIFACTS_DIR,
      `${contractName}.sol`,
      `${contractName}.json`,
    );

    if (!fs.existsSync(artifactPath)) {
      console.error(`  Artifact not found: ${artifactPath}`);
      console.error('  Run "npx hardhat compile" first');
      continue;
    }

    const artifact: ArtifactFile = JSON.parse(
      fs.readFileSync(artifactPath, 'utf-8'),
    );

    // Write ABI-only JSON (for The Graph and svc-blockchain)
    const abiJson = JSON.stringify(artifact.abi, null, 2);
    const abiFileName = `${contractName}.json`;

    // Write to local abi/ directory
    const localPath = path.join(ABI_OUTPUT_DIR, abiFileName);
    fs.writeFileSync(localPath, abiJson);
    console.log(`  Exported: ${localPath} (${artifact.abi.length} entries)`);

    // Write to Rust service abi/ directory
    const rustPath = path.join(RUST_ABI_DIR, abiFileName);
    fs.writeFileSync(rustPath, abiJson);
    console.log(`  Copied:   ${rustPath}`);
  }

  // Generate TypeScript type constants for ABI
  const indexContent = CONTRACTS.map(
    (name) => `export { default as ${name}ABI } from './${name}.json';`,
  ).join('\n');

  fs.writeFileSync(path.join(ABI_OUTPUT_DIR, 'index.ts'), indexContent + '\n');
  console.log('');
  console.log(`  Generated: ${path.join(ABI_OUTPUT_DIR, 'index.ts')}`);
  console.log('');
  console.log('ABI export complete');
}

main().catch((error) => {
  console.error('ABI export failed:', error);
  process.exitCode = 1;
});
