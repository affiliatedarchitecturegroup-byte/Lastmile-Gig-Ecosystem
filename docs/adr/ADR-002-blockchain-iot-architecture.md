# ADR-002: Blockchain & IoT Layer Architecture

**Status:** Accepted  
**Date:** 2026-05-15  
**Decision Makers:** Engineering Team  
**Category:** Architecture  

## Context

The Lastmile Gig platform requires:
1. An immutable audit trail for delivery verification that DFIs and insurers can independently audit
2. Automated escrow-based driver payouts tied to delivery confirmation
3. SLA enforcement between the platform and corporate fleet partners
4. Real-time fleet telemetry ingestion from vehicle OBD-II devices and GPS trackers

## Decision

### Blockchain Layer

- **Network:** Polygon CDK Layer 2 (EVM-compatible, near-zero gas fees)
- **Language:** Solidity 0.8.20 with OpenZeppelin v5 for access control, reentrancy protection, and pausability
- **Service:** Rust/Axum `svc-blockchain` as the exclusive blockchain interface (no other service writes to chain)
- **Indexing:** The Graph subgraph for blockchain data querying; PostgreSQL fallback for local audit trail
- **Tooling:** Hardhat for compilation, testing (95%+ coverage), and deployment

### IoT Telemetry Layer

- **Protocol:** MQTT 3.1.1 for device-to-service communication (low overhead, reliable)
- **Service:** Rust/Axum `svc-iot` with rumqttc for MQTT subscription
- **Storage:** TimescaleDB hypertables with automatic chunking, retention policies, and continuous aggregates
- **Processing:** Threshold-based alert engine with batch insert optimization

### Smart Contract Suite

| Contract | Purpose |
|---|---|
| DeliveryVerification | Immutable delivery proof records |
| DriverPayout | Escrow-based automated driver payouts |
| PartnerSLA | SLA enforcement with automated settlements |
| DriverIdentity | Decentralised Identity for driver credentials |

### Key Architectural Decisions

1. **Single blockchain gateway:** Only `svc-blockchain` writes to the chain, preventing nonce conflicts and centralizing gas management
2. **Event-driven recording:** Blockchain writes triggered by Kafka events (`order.delivered`, `payment.completed`) rather than synchronous API calls
3. **Dual indexing:** The Graph for public/GraphQL queries + local PostgreSQL for internal analytics and fallback
4. **Batch processing:** IoT telemetry buffered and batch-inserted to TimescaleDB for write throughput
5. **Geofencing:** Haversine distance calculations in Rust for sub-millisecond position checks

## Consequences

### Positive
- Immutable audit trail satisfies DFI compliance requirements
- Near-zero gas fees on Polygon CDK make per-delivery recording economically viable
- Rust services provide memory safety and high throughput for real-time processing
- TimescaleDB handles time-series data natively with automatic partitioning

### Negative
- Additional infrastructure complexity (MQTT broker, Polygon CDK node access)
- Smart contract upgrades require careful proxy pattern or redeployment
- Rust has a steeper learning curve for new team members

### Risks
- Polygon CDK network availability is external dependency
- MQTT broker single point of failure (mitigated by cluster deployment)

## Related

- [ADR-001: Polyglot Architecture](ADR-001-polyglot-architecture.md)
- [Spec 06: Blockchain Layer](../specs/06_BLOCKCHAIN_LAYER.md)
- [POLYGLOT_ARCHITECTURE.md](../../POLYGLOT_ARCHITECTURE.md)
