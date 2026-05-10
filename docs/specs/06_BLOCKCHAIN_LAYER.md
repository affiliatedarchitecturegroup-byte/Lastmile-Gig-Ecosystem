# BLOCKCHAIN LAYER SPECIFICATION
**Document:** 06 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Blockchain Strategy

The Lastmile Gig blockchain layer serves three primary institutional purposes:

1. **Trust Infrastructure** — Immutable, tamper-proof delivery records that DFIs and insurers can audit independently
2. **Financial Automation** — Smart contract-based driver payouts and partner SLA settlements that eliminate manual reconciliation
3. **Identity Layer** — Decentralised Identity (DID) for driver credentials that persists across platforms

The chosen network is **Polygon CDK** — a Layer 2 Ethereum-compatible chain — selected for:
- Near-zero gas fees (critical for micro-transactions at delivery scale)
- Full EVM compatibility (Solidity smart contracts, ethers.js tooling)
- Institutional credibility for DFI audit trail use cases
- Sub-second finality on L2

**Phasing:**
- **Phase 1 (Launch):** Delivery verification + driver payout smart contracts + audit trail
- **Phase 2:** Partner SLA smart contracts + automated penalty/reward logic
- **Phase 3:** Full Decentralised Identity (DID) for driver credentials

---

## 2. Smart Contract Architecture

### 2.1 DeliveryVerification.sol
**Purpose:** Record an immutable proof of delivery when an order is confirmed.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DeliveryVerification {
    struct DeliveryRecord {
        bytes32 orderId;
        bytes32 driverId;
        bytes32 customerId;
        int256  deliveryLat;    // GPS * 1e6 (fixed point)
        int256  deliveryLng;
        uint256 timestamp;
        bytes32 photoHash;      // IPFS hash of delivery photo
        bool    verified;
    }

    mapping(bytes32 => DeliveryRecord) public deliveries;
    
    event DeliveryRecorded(
        bytes32 indexed orderId,
        bytes32 indexed driverId,
        uint256 timestamp,
        bytes32 photoHash
    );

    function recordDelivery(
        bytes32 _orderId,
        bytes32 _driverId,
        bytes32 _customerId,
        int256  _lat,
        int256  _lng,
        bytes32 _photoHash
    ) external onlyAuthorised {
        deliveries[_orderId] = DeliveryRecord({
            orderId: _orderId, driverId: _driverId, customerId: _customerId,
            deliveryLat: _lat, deliveryLng: _lng,
            timestamp: block.timestamp, photoHash: _photoHash, verified: true
        });
        emit DeliveryRecorded(_orderId, _driverId, block.timestamp, _photoHash);
    }

    function verifyDelivery(bytes32 _orderId) external view returns (bool, uint256) {
        DeliveryRecord memory r = deliveries[_orderId];
        return (r.verified, r.timestamp);
    }
}
```

### 2.2 DriverPayout.sol
**Purpose:** Escrow-based automated payout to driver wallet upon delivery confirmation.

```solidity
contract DriverPayout {
    struct PayoutEscrow {
        address driverWallet;
        uint256 amount;
        bytes32 orderId;
        bool    released;
        uint256 releaseAfter;  // timestamp — held for 10 min post-delivery
    }

    mapping(bytes32 => PayoutEscrow) public escrows;

    event PayoutReleased(bytes32 indexed orderId, address indexed driver, uint256 amount);
    event EscrowCreated(bytes32 indexed orderId, address indexed driver, uint256 amount);

    function createEscrow(
        bytes32 _orderId,
        address _driverWallet,
        uint256 _amount
    ) external payable onlyPaymentService {
        require(msg.value == _amount, "Amount mismatch");
        escrows[_orderId] = PayoutEscrow({
            driverWallet: _driverWallet,
            amount: _amount,
            orderId: _orderId,
            released: false,
            releaseAfter: block.timestamp + 10 minutes
        });
        emit EscrowCreated(_orderId, _driverWallet, _amount);
    }

    function releasePayout(bytes32 _orderId) external {
        PayoutEscrow storage e = escrows[_orderId];
        require(!e.released, "Already released");
        require(block.timestamp >= e.releaseAfter, "Hold period active");
        e.released = true;
        payable(e.driverWallet).transfer(e.amount);
        emit PayoutReleased(_orderId, e.driverWallet, e.amount);
    }
}
```

### 2.3 PartnerSLA.sol
**Purpose:** Encode SLA terms between Lastmile Gig and corporate fleet clients. Automate penalty deductions and performance bonuses.

```solidity
contract PartnerSLA {
    struct SLAContract {
        address partnerAddress;
        uint256 deliveryTargetMinutes;  // e.g. 45 for Checkers 60/60
        uint256 penaltyPerBreachWei;    // penalty in wei per SLA breach
        uint256 bonusPerPerfectWeek;    // bonus for 100% weekly SLA
        bool    active;
    }

    mapping(bytes32 => SLAContract) public contracts;

    // SLA breach tracking and automated penalty execution
    function recordSLABreach(bytes32 _contractId, bytes32 _orderId) external;
    function recordSLASuccess(bytes32 _contractId, bytes32 _orderId) external;
    function executeWeeklySettlement(bytes32 _contractId) external;
}
```

### 2.4 DriverIdentity.sol (Phase 3 — DID)
**Purpose:** Issue and verify Decentralised Identity credentials for drivers.

```solidity
contract DriverIdentity {
    struct Credential {
        bytes32 driverId;
        bytes32 licenceHash;
        bytes32 biometricHash;  // hash of biometric template, not raw data
        uint256 issuedAt;
        uint256 expiresAt;
        bool    revoked;
    }

    mapping(bytes32 => Credential) public credentials;

    function issueCredential(
        bytes32 _driverId,
        bytes32 _licenceHash,
        bytes32 _biometricHash,
        uint256 _validityDays
    ) external onlyIdentityAuthority;

    function verifyCredential(bytes32 _driverId) external view 
        returns (bool valid, uint256 expiresAt);
    
    function revokeCredential(bytes32 _driverId) external onlyIdentityAuthority;
}
```

---

## 3. Rust Blockchain Service

The Rust service is the exclusive interface between the Lastmile Gig platform and the Polygon CDK chain. No other service writes to the blockchain directly.

```rust
// src/blockchain/client.rs
use ethers::{
    providers::{Http, Provider},
    signers::{LocalWallet, Signer},
    middleware::SignerMiddleware,
    contract::abigen,
};

abigen!(DeliveryVerification, "./abi/DeliveryVerification.json");
abigen!(DriverPayout, "./abi/DriverPayout.json");
abigen!(PartnerSLA, "./abi/PartnerSLA.json");

pub struct BlockchainClient {
    provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    delivery_contract: DeliveryVerification<SignerMiddleware<Provider<Http>, LocalWallet>>,
    payout_contract: DriverPayout<SignerMiddleware<Provider<Http>, LocalWallet>>,
}

impl BlockchainClient {
    pub async fn record_delivery(&self, record: DeliveryRecord) -> Result<TxHash, BlockchainError> {
        let tx = self.delivery_contract
            .record_delivery(
                record.order_id.into(),
                record.driver_id.into(),
                record.customer_id.into(),
                record.lat_fixed,
                record.lng_fixed,
                record.photo_hash.into(),
            )
            .send()
            .await?
            .await?;
        Ok(tx.unwrap().transaction_hash)
    }

    pub async fn release_payout(&self, order_id: [u8; 32]) -> Result<TxHash, BlockchainError> {
        // Execute smart contract payout to driver wallet
    }
}
```

---

## 4. The Graph — Blockchain Indexing

**The Graph** is used to index all Polygon CDK events, making blockchain data queryable via GraphQL — avoiding costly direct RPC calls for analytics and audit queries.

```graphql
# schema.graphql
type DeliveryRecord @entity {
  id: ID!
  orderId: Bytes!
  driverId: Bytes!
  timestamp: BigInt!
  latitude: BigInt!
  longitude: BigInt!
  photoHash: Bytes!
  verified: Boolean!
  blockNumber: BigInt!
  transactionHash: Bytes!
}

type PayoutEvent @entity {
  id: ID!
  orderId: Bytes!
  driverWallet: Bytes!
  amount: BigInt!
  timestamp: BigInt!
  transactionHash: Bytes!
}

# Query examples
query GetDeliveriesByDriver($driverId: Bytes!) {
  deliveryRecords(where: { driverId: $driverId }, orderBy: timestamp, orderDirection: desc) {
    orderId, timestamp, verified, photoHash
  }
}
```

---

## 5. Hardhat Development Environment

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    polygonCDK_testnet: {
      url: process.env.POLYGON_CDK_TESTNET_RPC,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    },
    polygonCDK_mainnet: {
      url: process.env.POLYGON_CDK_MAINNET_RPC,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  },
  gasReporter: { enabled: true, currency: "ZAR" }
};
```

**Test Coverage Requirements:**
- All smart contracts must have ≥ 95% test coverage (Hardhat + Chai)
- Every state-changing function must have both happy-path and revert test cases
- Slither static analysis must pass before any deployment

---

## 6. DFI Audit Trail Use Case

For sefa, KZN Growth Fund, and impact investors, the blockchain layer provides:

```
AUDIT CAPABILITY                    HOW
────────────────────────────────────────────────────────────────
Delivery count verification         Query The Graph: count DeliveryRecord events
Revenue verification                Query The Graph: sum PayoutEvent amounts
Driver activity verification        Query The Graph: DeliveryRecord by driverId
SLA compliance proof                Query PartnerSLA contract: breach/success ratio
Date-range audit                    Filter by blockNumber (mapped to timestamp)
Tamper-proof export                 Generate signed PDF report with tx hashes
```

The Admin & Compliance module (M14) exposes a DFI Audit Dashboard that queries The Graph and generates blockchain-verified PDF reports — suitable for submission to development finance institutions.

---

## 7. POPIA Considerations for Blockchain

**Critical:** Blockchain is immutable — this conflicts with POPIA's right to erasure.

**Resolution approach:**
- **No PII on-chain.** Only hashed identifiers, delivery coordinates, and payment amounts.
- Driver IDs and customer IDs are hashed UUIDs — not names, phone numbers, or email addresses.
- Biometric hashes stored on-chain in Phase 3 are one-way hashes of templates — not raw biometric data.
- POPIA erasure compliance is handled at the application layer (Supabase PostgreSQL), not the blockchain layer.
- Legal opinion obtained confirming that hashed identifiers do not constitute "personal information" under POPIA Section 1.

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
