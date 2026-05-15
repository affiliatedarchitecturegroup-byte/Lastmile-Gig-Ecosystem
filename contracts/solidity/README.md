# Lastmile Gig - Smart Contracts

Polygon CDK Layer 2 smart contracts for the Lastmile Gig delivery ecosystem.

## Contracts

| Contract | Purpose | Phase |
|---|---|---|
| `DeliveryVerification.sol` | Immutable delivery proof records for DFI audit trail | Phase 1 |
| `DriverPayout.sol` | Escrow-based automated driver payouts | Phase 1 |
| `PartnerSLA.sol` | SLA enforcement with automated settlements | Phase 2 |
| `DriverIdentity.sol` | Decentralised Identity (DID) for driver credentials | Phase 3 |

## Setup

```bash
cd contracts/solidity
npm install
cp .env.example .env  # Configure environment variables
```

## Commands

```bash
npm run compile        # Compile contracts
npm run test           # Run test suite
npm run test:coverage  # Run with coverage report
npm run gas-report     # Generate gas usage report
npm run lint:sol       # Lint Solidity files
npm run deploy:testnet # Deploy to Polygon CDK testnet
npm run deploy:mainnet # Deploy to Polygon CDK mainnet
```

## Architecture

The Rust `svc-blockchain` service is the exclusive interface between the platform
and the Polygon CDK chain. No other service writes to the blockchain directly.

```
svc-blockchain (Rust/Axum)
    |
    v
Polygon CDK L2
    |
    +-- DeliveryVerification
    +-- DriverPayout
    +-- PartnerSLA
    +-- DriverIdentity
    |
    v
The Graph (Indexing)
    |
    v
GraphQL API (Querying)
```

## Security

- All contracts use OpenZeppelin AccessControl for role-based permissions
- ReentrancyGuard on all state-changing functions with value transfers
- Pausable for emergency circuit breaker
- Custom errors for gas-efficient reverts
- Coordinate validation for GPS data
- No raw biometric data stored on-chain (hashes only)

## Testing

Test coverage target: >= 95% for all smart contracts.

```bash
npx hardhat test
npx hardhat coverage
```

## Deployment

See `scripts/deploy.ts` for the deployment script. Contracts are deployed
in order: DeliveryVerification, DriverPayout, PartnerSLA, DriverIdentity.

After deployment:
1. Verify contracts on block explorer
2. Grant RECORDER_ROLE to svc-blockchain service wallet
3. Grant PAYMENT_SERVICE_ROLE to payment service wallet
4. Update environment variables with deployed addresses
5. Deploy The Graph subgraph

---

*See docs/specs/06_BLOCKCHAIN_LAYER.md for the full specification.*
