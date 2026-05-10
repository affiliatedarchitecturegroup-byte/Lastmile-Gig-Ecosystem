# POLYGLOT ARCHITECTURE

**Project:** Lastmile Gig Ecosystem  
**Classification:** Architecture Reference Document  

---

## 1. Architecture Overview

Lastmile Gig is built on a polyglot microservices architecture with 6 backend languages, 3 frontend frameworks, and a blockchain layer. Each language is selected for domain fit, not convenience.

```
                    CLIENT LAYER
    Next.js 14  |  Angular 17  |  React Native + Expo
                        |
              AWS API GATEWAY + ISTIO MESH
                        |
    +-------+-------+-------+-------+-------+-------+
    |       |       |       |       |       |       |
  NestJS  FastAPI   Go    Rust   Spring  Elixir  Solidity
   (TS)  (Python)              Boot    Phoenix
    |       |       |       |       |       |       |
              DATA LAYER
  Supabase | MongoDB | Redis | TimescaleDB | Pinecone | OpenSearch
```

---

## 2. Language Allocation Matrix

### 2.1 TypeScript + NestJS (Core Platform Services)

**Services:**
| Service | Port | Database | Kafka Topics |
|---|---|---|---|
| API Gateway | 3000 | - | - |
| Auth Service | 3001 | Supabase | - |
| Driver Service | 3002 | Supabase + MongoDB | driver.* |
| Order Service | 3003 | Supabase + MongoDB | order.* |
| Fleet Service | 3004 | Supabase + TimescaleDB | fleet.* |
| Storefront Service | 3005 | MongoDB + Supabase | - |

**Key Patterns:**
- Dependency injection via NestJS decorators
- class-validator for input validation
- class-transformer for response serialization
- GraphQL via @nestjs/graphql for investor/partner dashboards
- Shared TypeScript types across frontend and backend

**LoC Target:** ~86,000

### 2.2 Python + FastAPI (AI & Intelligence)

**Services:**
| Service | Port | Database | Kafka Topics |
|---|---|---|---|
| AI Inference Service | 8000 | Pinecone + MongoDB | - |
| Agent Service (LangGraph/CrewAI) | 8001 | Pinecone + MongoDB | - |
| Analytics Service | 8002 | TimescaleDB + MongoDB | analytics.* |

**Key Patterns:**
- Async-native with uvicorn/asyncio
- LangChain for RAG pipelines
- LangGraph for stateful agent workflows
- CrewAI for multi-agent crews
- AWS Bedrock (Claude) as primary LLM
- Pinecone for vector retrieval
- SageMaker for custom ML models

**LoC Target:** ~80,000

### 2.3 Go (High-Throughput Services)

**Services:**
| Service | Port | Database | Kafka Topics |
|---|---|---|---|
| Dispatch Engine | 4000 | Redis + Supabase | order.*, driver.* |
| Route Optimizer | 4001 | Redis | - |
| Kafka Consumer Pool | 4002 | Various | all lmg.* topics |

**Key Patterns:**
- Goroutine pool per region for parallel dispatch matching
- Gin for HTTP endpoints
- confluent-kafka-go for Kafka consumption
- gRPC for AI service communication
- Redis for real-time state (driver pool, dispatch locks)

**LoC Target:** ~44,000

### 2.4 Rust (Cryptographic & IoT Services)

**Services:**
| Service | Port | Database | Kafka Topics |
|---|---|---|---|
| Blockchain Service | 5000 | - | order.delivered |
| IoT Telemetry Ingestion | 5001 | TimescaleDB | fleet.telemetry |

**Key Patterns:**
- Axum for HTTP, Tokio for async runtime
- ethers-rs for Polygon CDK interaction
- sqlx for TimescaleDB writes
- rumqtt for MQTT IoT ingestion
- Zero-cost abstractions for performance-critical paths

**LoC Target:** ~35,000

### 2.5 Java + Spring Boot (Enterprise Services)

**Services:**
| Service | Port | Database | Kafka Topics |
|---|---|---|---|
| Payment Service | 6000 | Supabase | payment.* |
| Enterprise Logistics | 6001 | Supabase | logistics.* |

**Key Patterns:**
- Spring Integration for ERP/POS adapters
- Apache Camel for enterprise integration routes
- JasperReports for invoice/report PDF generation
- Hibernate for ORM
- Spring Kafka for event consumption

**LoC Target:** ~50,000

### 2.6 Elixir + Phoenix (Real-Time Services)

**Services:**
| Service | Port | Database | Kafka Topics |
|---|---|---|---|
| Real-Time Tracking | 7000 | Redis | driver.location |
| Communications Hub | 7001 | Supabase | all notification events |

**Key Patterns:**
- Phoenix Channels for WebSocket at scale (10k+ concurrent)
- Broadway for Kafka consumption
- Oban for background job processing
- OTP supervision trees for fault tolerance
- Ecto for database access

**LoC Target:** ~30,000

### 2.7 Solidity (Smart Contracts)

**Contracts:**
| Contract | Network | Purpose |
|---|---|---|
| DeliveryVerification.sol | Polygon CDK | Immutable delivery proof |
| DriverPayout.sol | Polygon CDK | Escrow-based driver payouts |
| PartnerSLA.sol | Polygon CDK | SLA enforcement + settlements |
| DriverIdentity.sol | Polygon CDK | Decentralized Identity (Phase 3) |

**LoC Target:** ~950

---

## 3. Frontend Architecture

### 3.1 Next.js 14 (Market-Facing Surfaces)

| Surface | URL | Rendering |
|---|---|---|
| Corporate Landing | lastmilegig.aagais.co.za | SSG + ISR |
| Restaurant Storefronts | /store/[slug] | SSR + ISR |
| Customer Ordering | /order | SSR + WebSocket |
| Loyalty & Rewards | /rewards | Client-side SPA |

**Stack:** TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, Framer Motion, Sanity CMS, Cloudinary

### 3.2 Angular 17 (Operational Dashboards)

| Surface | URL | Features |
|---|---|---|
| Ops Dashboards | ops.lastmilegig.aagais.co.za | Fleet, drivers, dispatch |
| Admin Console | admin.lastmilegig.aagais.co.za | RBAC, audit, compliance |
| Command Centre | command.lastmilegig.aagais.co.za | Live map, incidents |

**Stack:** TypeScript, Angular Material, NgRx, RxJS, Chart.js/D3.js, Mapbox GL, Socket.io

### 3.3 React Native + Expo (Mobile)

| App | Platform | Key Features |
|---|---|---|
| Customer App | iOS + Android | Order, track, pay, rewards |
| Driver App | Android (primary) | Accept orders, navigate, earn |

**Stack:** TypeScript, Expo SDK 51, Expo Router v3, Zustand, React Query, React Native Maps

---

## 4. Inter-Service Communication

### 4.1 Synchronous (Request-Response)
- **REST** (external-facing, documented via OpenAPI 3.1)
- **gRPC** (internal service-to-service, performance-critical)
- **GraphQL** (investor/partner dashboards, flexible queries)

### 4.2 Asynchronous (Event-Driven)
- **Apache Kafka** (primary event backbone, all domain events)
- **BullMQ** (background jobs via Upstash Redis)
- **Phoenix Channels** (real-time WebSocket broadcasts)

### 4.3 Kafka Topic Architecture
```
lmg.orders.placed          order-service      -> dispatch-engine, analytics
lmg.orders.dispatched       dispatch-engine    -> order-service, tracking, comms
lmg.orders.delivered         order-service      -> payment-service, blockchain
lmg.drivers.status           driver-service     -> dispatch-engine, command-centre
lmg.drivers.location         tracking-service   -> analytics, command-centre
lmg.payments.completed       payment-service    -> order-service, comms, analytics
lmg.fleet.telemetry          iot-service        -> fleet-service, ai-inference
lmg.fleet.maintenance        fleet-service      -> comms, command-centre
lmg.fraud.alert              ai-service         -> security, comms, admin
lmg.esg.metrics              iot-service        -> esg-service, analytics
```

---

## 5. Data Layer

| Database | Provider | Type | Services |
|---|---|---|---|
| PostgreSQL | Supabase | Relational | All core services |
| MongoDB | MongoDB Atlas | Document | Events, menus, agent logs |
| Redis | Upstash | Cache/Queue | Sessions, rate limits, jobs |
| TimescaleDB | Supabase ext. | Time-Series | IoT, carbon, metrics |
| Elasticsearch | AWS OpenSearch | Search | Menu search, driver discovery |
| Pinecone | Pinecone Cloud | Vector | RAG, semantic search |

---

## 6. System Agnostic Design Principles

The Lastmile Gig platform is designed to be system agnostic:

1. **Cloud Portable:** While currently AWS-native, all services use standard protocols (REST, gRPC, Kafka, MQTT) enabling multi-cloud migration
2. **Database Abstraction:** Services interact via repository patterns, not direct SQL, enabling database swaps
3. **Container Native:** All services run as Docker containers on Kubernetes, deployable to any K8s cluster
4. **Protocol Standard:** OpenAPI, gRPC proto files, and GraphQL schemas serve as contracts independent of implementation
5. **Event-Driven Decoupling:** Kafka events decouple services; any consumer can be rewritten without affecting producers

---

*This architecture is deliberate. Each language and framework decision has been documented and justified in the technical specification suite (docs/specs/02_TECH_STACK.md).*
