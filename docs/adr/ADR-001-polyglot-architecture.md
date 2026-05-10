# ADR-001: Polyglot Microservices Architecture

**Status:** Accepted  
**Date:** 2026-05-10  
**Deciders:** Fortune (MD), AAG Tech Lead  
**Phase:** P001  

---

## Context

Lastmile Gig requires a platform that handles diverse workloads: real-time WebSocket connections for 10,000+ drivers, high-throughput dispatch decisions at sub-second latency, AI/ML inference pipelines, cryptographic blockchain interactions, enterprise ERP integrations, and market-facing web surfaces requiring SEO optimization.

A single-language approach would require compromises in at least some of these domains.

## Decision

Adopt a polyglot microservices architecture with 6 backend languages, each selected for its domain fit:

1. **TypeScript/NestJS** - Core services (type-safe, DI, shared types with frontend)
2. **Python/FastAPI** - AI/ML (dominant ecosystem for LangChain, SageMaker, ML libraries)
3. **Go** - Dispatch/routing (goroutine concurrency, low latency, small binary)
4. **Rust** - Blockchain/IoT (memory safety, zero-cost abstractions, ethers-rs)
5. **Java/Spring Boot** - Payments/enterprise (mature ERP ecosystem, Spring Integration)
6. **Elixir/Phoenix** - Real-time (BEAM VM, millions of processes, self-healing)

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| TypeScript-only (Node.js) | Single language, shared types | Poor AI/ML support, no goroutine equivalent, memory issues at WebSocket scale |
| Python-only | Strong AI, widely known | Slow for real-time/dispatch, GIL limitations |
| Go-only | Fast, concurrent | Weak AI/ML ecosystem, no DI framework, verbose for CRUD |

## Consequences

### Positive
- Each domain uses the best-fit language and ecosystem
- Services are independently deployable and scalable
- No single-language bottleneck constrains any domain
- Attracts specialized talent for each language

### Negative
- Higher cognitive load for developers working across languages
- More complex CI/CD pipeline (multi-language build matrix)
- Smaller hiring pool for some languages (Elixir, Rust) in South Africa
- Inter-service contracts (protobuf, OpenAPI) add overhead

### Risks
- Team knowledge silos per language
- Mitigation: shared TypeScript types library, comprehensive API docs, ADR culture

## References

- docs/specs/02_TECH_STACK.md
- docs/specs/04_BACKEND_MICROSERVICES.md
