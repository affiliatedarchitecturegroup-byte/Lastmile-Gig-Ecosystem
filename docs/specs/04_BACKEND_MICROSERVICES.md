# BACKEND MICROSERVICES SPECIFICATION
**Document:** 04 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Microservices Philosophy

Every service in the Lastmile Gig backend is:
- **Independently deployable** — no shared runtime, no monolithic coupling
- **Independently scalable** — Kubernetes HPA per service based on real metrics
- **Domain-bounded** — each service owns its data, its schema, its API contract
- **Language-appropriate** — the language is chosen for the domain, not for consistency
- **Observable** — every service emits OpenTelemetry traces, Prometheus metrics, and structured logs

Inter-service communication follows two patterns:
- **Synchronous** — gRPC (internal service-to-service) or REST (external-facing)
- **Asynchronous** — Apache Kafka (event-driven workflows, domain events)

---

## 2. Service Registry

### 2.1 API Gateway Service
**Language:** TypeScript + NestJS  
**Role:** Single entry point for all external traffic. Routes to downstream services, enforces auth, rate limiting, and API key validation.

```
Port:        3000 (internal), 443 (external via AWS ALB)
Protocol:    REST + GraphQL
Auth:        Auth0 JWT validation middleware
Rate Limit:  Upstash Redis (sliding window, per API key)
Docs:        OpenAPI 3.1 auto-generated via @nestjs/swagger
```

**Routing Table:**
```
POST   /auth/*              → auth-service
GET    /drivers/*           → driver-service
GET    /orders/*            → order-service
GET    /fleet/*             → fleet-service
GET    /restaurants/*       → storefront-service
GET    /logistics/*         → enterprise-logistics-service
POST   /payments/*          → payment-service
GET    /analytics/*         → analytics-service
WS     /tracking            → tracking-service (Elixir)
```

---

### 2.2 Auth Service
**Language:** TypeScript + NestJS  
**Database:** Supabase (PostgreSQL)  
**External:** Auth0, AWS Cognito

```typescript
// Responsibilities
- OAuth2 / SSO flow coordination with Auth0
- JWT issuance and refresh token management
- Role-based access control (RBAC) enforcement
- Biometric session token management
- API key provisioning for partner developers (Module 20)
- Session audit logging to PostgreSQL

// Key Endpoints
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/api-key/generate
GET  /auth/me
POST /auth/biometric/verify
```

---

### 2.3 Driver Service
**Language:** TypeScript + NestJS  
**Database:** Supabase (PostgreSQL) + MongoDB Atlas (event logs)

```typescript
// Responsibilities
- Driver registration and profile management
- Biometric onboarding workflow coordination
- Driver availability and status management
- Performance score retrieval (from AI service)
- Rental request management
- Integration with IoT telemetry for active vehicle assignment

// Key Endpoints
POST   /drivers/register
POST   /drivers/onboard/biometric
GET    /drivers/:id
PATCH  /drivers/:id/status          // active | idle | offline
GET    /drivers/:id/performance
GET    /drivers/:id/rentals
POST   /drivers/:id/rentals/request
GET    /drivers/available           // geo-filtered, available pool

// Kafka Events Published
driver.registered
driver.status.changed
driver.onboarding.completed
driver.rental.started
driver.rental.ended
```

---

### 2.4 Order Service
**Language:** TypeScript + NestJS  
**Database:** Supabase (PostgreSQL) primary + MongoDB Atlas (event log)

```typescript
// Responsibilities
- Order placement and validation
- Order lifecycle management (placed → confirmed → dispatched → delivered)
- Geo-tagged delivery verification
- Blockchain proof-of-delivery trigger
- Real-time status broadcast (via Elixir WebSocket service)

// Key Endpoints
POST   /orders                      // place order
GET    /orders/:id
PATCH  /orders/:id/status
POST   /orders/:id/verify-delivery  // geo-tag + photo verification
GET    /orders/customer/:customerId
GET    /orders/driver/:driverId

// Kafka Events Published
order.placed
order.confirmed
order.dispatched
order.delivered
order.cancelled
order.delivery.verified
```

---

### 2.5 Dispatch Engine Service
**Language:** Go  
**Database:** Upstash Redis (real-time state) + Supabase (persistence)  
**Consumes:** Kafka (`order.placed`, `driver.status.changed`)

```go
// Responsibilities
// - Match incoming orders to optimal available drivers
// - Apply AI route optimisation (consumes AI service via gRPC)
// - Manage dispatch queue with priority weighting
// - Publish dispatch decisions to Kafka
// - Handle driver acceptance/rejection flows

// Architecture: Event-driven, stateless workers with Redis state
// Concurrency: Goroutine pool per region (KZN, Gauteng, WC)
// SLA: < 800ms from order.placed to dispatch decision

// Kafka Events Consumed
order.placed → trigger matching algorithm
driver.status.changed → update availability pool

// Kafka Events Published
order.dispatched → notify order service + tracking service
dispatch.failed → trigger fallback logic
```

---

### 2.6 Real-Time Tracking Service
**Language:** Elixir + Phoenix  
**Database:** Upstash Redis (ephemeral location state)  
**Protocol:** WebSocket (Phoenix Channels)

```elixir
# Responsibilities
# - Maintain persistent WebSocket connections for drivers (location push)
# - Maintain persistent WebSocket connections for customers (order tracking)
# - Broadcast driver location updates at 5-second intervals
# - Publish location events to Kafka for analytics

# Channel Architecture
"driver:#{driver_id}"    → driver pushes GPS coords every 5s
"order:#{order_id}"      → customer subscribes for live tracking
"ops:global"             → command centre subscribes for all activity

# Scale target: 10,000 concurrent WebSocket connections per node
# BEAM VM handles this with <2MB RAM per 10k connections
```

---

### 2.7 Fleet Management Service
**Language:** TypeScript + NestJS  
**Database:** Supabase (PostgreSQL) + TimescaleDB (telemetry)

```typescript
// Responsibilities
- Vehicle inventory management (scooters, vans, EV fleet)
- Rental booking and assignment
- Predictive maintenance scheduling (consumes IoT telemetry)
- Fleet utilisation analytics
- Integration with Bosch Service and Supa Quick APIs

// Key Endpoints
GET    /fleet/vehicles
GET    /fleet/vehicles/:id
GET    /fleet/vehicles/:id/telemetry    // TimescaleDB feed
POST   /fleet/rentals
GET    /fleet/maintenance/schedule
POST   /fleet/maintenance/alert         // IoT-triggered
GET    /fleet/ev/status                 // EV fleet dashboard data
```

---

### 2.8 IoT Telemetry Ingestion Service
**Language:** Rust  
**Database:** TimescaleDB (via Supabase extension)  
**Protocol:** MQTT / HTTP (from vehicle IoT sensors)

```rust
// Responsibilities
// - Ultra-low-latency ingestion of vehicle telemetry (GPS, speed, battery, engine)
// - Time-series storage in TimescaleDB
// - Real-time anomaly detection triggers (passes to AI service)
// - Predictive maintenance signal generation

// Data schema per telemetry event
struct TelemetryEvent {
    vehicle_id: Uuid,
    timestamp: DateTime<Utc>,
    latitude: f64,
    longitude: f64,
    speed_kmh: f32,
    battery_pct: Option<f32>,   // EV only
    engine_temp_c: f32,
    odometer_km: f32,
    fuel_level_pct: Option<f32>,
    error_codes: Vec<String>,
}

// Performance target: 100,000 events/second ingestion rate
// Retention: 90 days hot (TimescaleDB), 7 years cold (S3 Parquet)
```

---

### 2.9 AI Inference Service
**Language:** Python + FastAPI  
**Infrastructure:** AWS SageMaker endpoints  
**Database:** Pinecone (vector), MongoDB Atlas (model artifacts)

```python
# Responsibilities
# - Serve real-time AI inference requests from all services
# - Route optimisation (consumes OSRM + custom ML model)
# - Demand forecasting (time-series model per region)
# - Driver performance scoring (XGBoost model)
# - Fraud / anomaly detection (isolation forest + LangGraph)
# - Customer behaviour personalisation

# Key Endpoints
POST /ai/route-optimise          # returns optimal route for driver
POST /ai/demand-forecast         # returns 24h demand by zone
POST /ai/driver-score/:id        # returns composite performance score
POST /ai/fraud-check             # returns risk score for transaction
POST /ai/recommend/restaurants   # returns personalised restaurant list

# SageMaker Model Endpoints
lmg-route-optimiser-endpoint
lmg-demand-forecaster-endpoint
lmg-driver-scorer-endpoint
lmg-fraud-detector-endpoint
```

---

### 2.10 LangChain / LangGraph Agent Service
**Language:** Python + FastAPI  
**Infrastructure:** AWS Bedrock (Claude as LLM), Pinecone (RAG)

```python
# Responsibilities
# - Run stateful LangGraph agent workflows
# - Orchestrate CrewAI multi-agent crews
# - Serve RAG queries (partner onboarding, driver FAQ, ESG reports)
# - Human-in-the-loop approval gate management

# LangGraph Workflows
dispatch_decision_graph     → evaluate dispatch options, return ranked choices
fraud_investigation_graph   → multi-step fraud analysis with HITL escalation
risk_scoring_graph          → per-delivery risk assessment pipeline
onboarding_agent_graph      → guide new partner through onboarding steps

# CrewAI Crews
DemandForecastingCrew       → agents: DataAnalyst, RegionalPlanner, Forecaster
RouteOptimisationCrew       → agents: MapAnalyst, TrafficAgent, RoutePlanner
ESGReportingCrew            → agents: CarbonAnalyst, FleetAuditor, ReportWriter
PartnerOnboardingCrew       → agents: DocumentReviewer, ComplianceChecker, Approver
```

---

### 2.11 Storefront Service
**Language:** TypeScript + NestJS (API) + Elixir (real-time orders)  
**Database:** MongoDB Atlas (menus) + Supabase (orders) + Sanity (CMS)

```typescript
// Responsibilities
- Restaurant/partner profile management
- Menu CRUD (synced from Sanity CMS via webhook)
- Order intake from storefront pages
- Real-time order status broadcasting to partner dashboard
- Per-partner analytics aggregation

// Key Endpoints
GET    /restaurants                 // directory listing
GET    /restaurants/:slug           // storefront data
GET    /restaurants/:slug/menu      // full menu
POST   /restaurants/:slug/orders    // place order
GET    /partners/:id/analytics      // per-partner analytics
POST   /partners/:id/menu/sync      // Sanity webhook receiver
```

---

### 2.12 Payment Service
**Language:** Java + Spring Boot  
**Database:** Supabase (PostgreSQL) — all financial records  
**External:** Paystack, Stripe, Flutterwave, Peach, Ozow, Polygon CDK

```java
// Responsibilities
// - Unified payment abstraction layer across all 7 gateways
// - Smart contract payout execution (Polygon CDK)
// - Reconciliation engine (daily reconciliation jobs)
// - Refund processing
// - Driver instant payout orchestration
// - Invoice generation (JasperReports)

// Key Endpoints
POST   /payments/initiate           // select gateway based on context
POST   /payments/payout/driver      // instant driver payout
POST   /payments/smart-contract     // trigger Polygon CDK settlement
GET    /payments/reconciliation     // daily reconciliation report
POST   /payments/refund/:id
GET    /payments/invoice/:id        // PDF invoice download

// Gateway Selection Logic
customer payment (ZA)  → Paystack
corporate invoice       → Stripe
driver payout (instant) → Ozow
enterprise contract     → Peach Payments
SLA settlement          → Polygon CDK smart contract
```

---

### 2.13 Blockchain Service
**Language:** Rust  
**External:** Polygon CDK (L2), The Graph (indexing)

```rust
// Responsibilities
// - Write immutable delivery records to Polygon CDK
// - Execute smart contract payouts to driver wallets
// - Verify delivery proof via smart contract
// - Manage Decentralised Identity (DID) for drivers
// - Expose blockchain audit trail for DFI compliance

// Smart Contracts (Solidity, deployed via Hardhat)
DeliveryVerification.sol    → records delivery hash, GPS coords, timestamp
DriverPayout.sol            → escrow + automated payout on delivery confirmation
PartnerSLA.sol              → SLA terms, penalty/reward logic
DriverIdentity.sol          → DID credential issuance and verification

// Rust service wraps ethers-rs for all on-chain interactions
// Events indexed by The Graph for fast querying
```

---

### 2.14 Enterprise Logistics Service
**Language:** Java + Spring Boot + Go (high-throughput consumers)  
**External:** Takealot API, DSV API, Courier Guy API

```java
// Responsibilities
// - Third-party logistics API integration (Takealot, DSV, Courier Guy)
// - Parcel tracking aggregation
// - Warehouse management interface
// - Smart SLA enforcement via Polygon CDK
// - AI load balancing across fleet (consumes AI service)

// Key Endpoints
POST   /logistics/shipments         // create shipment (routes to provider)
GET    /logistics/shipments/:id     // unified tracking across all providers
GET    /logistics/sla/:contractId   // SLA compliance status
POST   /logistics/warehouse/inbound // warehouse intake
GET    /logistics/analytics         // fleet utilisation + SLA metrics
```

---

### 2.15 Communications Service
**Language:** Elixir + Phoenix  
**External:** Twilio (SMS/WhatsApp), Firebase (push), SendGrid (email)

```elixir
# Responsibilities
# - Unified notification dispatch across all channels
# - Template management (per notification type)
# - Delivery receipt tracking
# - Rate limiting per user per channel (via Upstash Redis)
# - Retry logic with exponential backoff (via Oban)

# Notification Types
:order_placed           → customer SMS + push + email
:order_dispatched       → customer push + SMS
:driver_assigned        → customer push (with driver details)
:delivery_confirmed     → customer push + email receipt
:payout_processed       → driver SMS + push
:maintenance_alert      → fleet manager email + push
:esg_report_ready       → admin email with PDF attachment
```

---

## 3. Inter-Service Communication

### 3.1 Kafka Topic Architecture
```
TOPIC                          PRODUCERS            CONSUMERS
─────────────────────────────────────────────────────────────
lmg.orders.placed              order-service        dispatch-engine, analytics
lmg.orders.dispatched          dispatch-engine      order-service, tracking, comms
lmg.orders.delivered           order-service        payment-service, blockchain
lmg.drivers.status             driver-service       dispatch-engine, command-centre
lmg.drivers.location           tracking-service     analytics, command-centre
lmg.payments.completed         payment-service      order-service, comms, analytics
lmg.fleet.telemetry            iot-service          fleet-service, ai-inference
lmg.fleet.maintenance          fleet-service        comms, command-centre
lmg.fraud.alert                ai-service           security, comms, admin
lmg.esg.metrics                iot-service          esg-service, analytics
```

### 3.2 gRPC Service Contracts (Internal)
```protobuf
// dispatch ↔ ai-inference
service AIDispatch {
  rpc GetOptimalRoute(RouteRequest) returns (RouteResponse);
  rpc GetDemandForecast(ForecastRequest) returns (ForecastResponse);
}

// order ↔ blockchain
service BlockchainVerification {
  rpc RecordDelivery(DeliveryRecord) returns (TxHash);
  rpc VerifyDelivery(TxHash) returns (VerificationResult);
}

// payment ↔ blockchain
service SmartContractPayout {
  rpc ExecutePayout(PayoutRequest) returns (TxReceipt);
}
```

---

## 4. Service Health & SLAs

| Service | SLA Target | Scaling Strategy |
|---|---|---|
| API Gateway | 99.99% uptime, <100ms p95 | HPA min 3 / max 20 replicas |
| Dispatch Engine | <800ms dispatch decision | HPA, Go goroutine pool per region |
| Tracking Service (Elixir) | 10k concurrent WS | Elixir clustering, 3 nodes minimum |
| AI Inference | <2s p95 response | SageMaker auto-scaling endpoints |
| Payment Service | 99.999% (five-nines) | HPA + circuit breaker (Istio) |
| Order Service | <200ms p95 | HPA min 3 / max 15 replicas |
| IoT Telemetry | 100k events/sec | Rust + Kafka partitioning |

---

## 5. API Standards

All REST APIs follow:
- **OpenAPI 3.1** specification (auto-generated where possible)
- **JSON:API** response format for collection resources
- **RFC 7807** Problem Details for error responses
- **ISO 8601** for all timestamps
- **UUID v4** for all entity identifiers
- **Semantic Versioning** for API versions (`/v1/`, `/v2/`)
- **Rate Limiting Headers** (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
