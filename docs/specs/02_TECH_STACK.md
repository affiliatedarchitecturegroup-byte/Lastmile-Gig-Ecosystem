# TECH STACK SPECIFICATION
**Document:** 02 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Architecture Model

Lastmile Gig is built on a **polyglot microservices architecture** — six backend languages, each selected for its domain fit, deployed on AWS EKS, orchestrated with Kubernetes and Istio, provisioned via Terraform, and delivered via GitOps with ArgoCD.

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│   Next.js 14  │  Angular 17  │  React Native + Expo         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│              AWS API GATEWAY + ISTIO MESH                    │
└─────┬──────┬──────┬──────┬──────┬──────┬────────────────────┘
      │      │      │      │      │      │
   NestJS  FastAPI   Go   Rust  Spring  Elixir
   (TS)   (Python)        (JVM)  Boot   Phoenix
      │      │      │      │      │      │
┌─────▼──────▼──────▼──────▼──────▼──────▼────────────────────┐
│         DATA LAYER                                           │
│  Supabase/PostgreSQL │ MongoDB Atlas │ Upstash Redis         │
│  TimescaleDB │ Elasticsearch │ Pinecone (Vector)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Stack

### 2.1 Next.js 14 (App Router) — Market-Facing Surfaces
**Modules:** Corporate Landing (M1), Restaurant Storefronts (M15), Customer Ordering Web (M7), Loyalty (M18)

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.x (App Router) | SSR/SSG for SEO, SPA behaviour for dashboards |
| TypeScript | 5.x | Type safety across all surfaces |
| Tailwind CSS | 3.x | Utility-first styling system |
| shadcn/ui | Latest | Accessible, composable component library |
| Sanity | v3 | Headless CMS for corporate content and restaurant menus |
| Cloudinary | SDK v2 | Media asset management (restaurant images, driver photos) |
| Zustand | 4.x | Lightweight client state management |
| React Query (TanStack) | v5 | Server state, caching, background sync |
| Framer Motion | 11.x | Animation and micro-interactions |
| next-auth | v5 | Auth integration with Auth0 |

**Rendering Strategy:**
- Corporate Landing → Static Site Generation (SSG) + ISR
- Restaurant Storefronts → SSR for SEO + ISR for menu updates
- Customer Ordering → SSR with real-time WebSocket overlay
- Loyalty Module → Client-side SPA

### 2.2 Angular 17 — Internal & Operational Dashboards
**Modules:** Orchestration (M2), Driver Rental (M3), Contracted Fleet (M4), ESG (M11), Admin (M14), Driver Wallet (M16), Command Centre (M19)

| Technology | Version | Purpose |
|---|---|---|
| Angular | 17.x (Signals) | Component framework with fine-grained reactivity |
| TypeScript | 5.x | Full type safety |
| Angular Material | 17.x | Base component library |
| Angular CDK | 17.x | Drag-drop, virtual scroll, overlay |
| RxJS | 7.x | Reactive streams for real-time data |
| NgRx | 17.x | Redux-pattern state management |
| Chart.js / D3.js | Latest | Data visualisation and charting |
| Mapbox GL | Latest | Live delivery map, fleet tracking |
| Socket.io Client | 4.x | Real-time WebSocket events |

### 2.3 React Native + Expo — Mobile Applications
**Apps:** Customer Mobile App, Driver Mobile App

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.74+ | Cross-platform mobile (iOS + Android) |
| Expo | SDK 51 | Managed workflow, OTA updates |
| Expo Router | v3 | File-based navigation |
| React Native Maps | Latest | Live delivery tracking map |
| Expo Camera | Latest | Facial recognition capture (driver verification) |
| React Native Reanimated | 3.x | Smooth, performant animations |
| Zustand | 4.x | Mobile state management |
| React Query | v5 | API data fetching and caching |

---

## 3. Backend Language Allocation

### 3.1 TypeScript + NestJS
**Services:** API Gateway, Corporate Service, Partner Service, Compliance Service, Notification Orchestrator, Auth Service

```
Rationale:
- Type-safe, structured architecture with decorators and dependency injection
- First-class GraphQL support via @nestjs/graphql + Apollo
- Excellent microservices support (TCP, Redis, Kafka transports)
- Shared TypeScript types across frontend and backend monorepo
```

Key Libraries: `@nestjs/microservices`, `@nestjs/graphql`, `passport`, `class-validator`, `typeorm`, `bull`

### 3.2 Python + FastAPI
**Services:** AI Inference Service, LangChain Orchestrator, LangGraph Agent Engine, CrewAI Task Runner, SageMaker Pipeline Interface, Demand Forecasting Service

```
Rationale:
- Dominant AI/ML ecosystem (PyTorch, scikit-learn, Hugging Face)
- Async-native with uvicorn/asyncio
- Native LangChain, LangGraph, CrewAI compatibility
- FastAPI auto-generates OpenAPI specs
```

Key Libraries: `langchain`, `langgraph`, `crewai`, `boto3`, `sagemaker`, `scikit-learn`, `pandas`, `numpy`, `pinecone-client`, `opentelemetry-sdk`

### 3.3 Go
**Services:** Dispatch Engine, Real-Time Tracking Service, Kafka Consumer Pool, IoT Telemetry Ingestion, Route Optimisation Service, Load Balancer

```
Rationale:
- Exceptional throughput and low latency for high-frequency operations
- Goroutine concurrency model ideal for thousands of simultaneous driver events
- Small binary footprint — efficient Kubernetes pod sizing
- Superior Kafka consumer performance
```

Key Libraries: `confluent-kafka-go`, `gin`, `go-redis`, `gorm`, `uber/zap`, `opentelemetry-go`

### 3.4 Rust
**Services:** Cryptographic Layer, Blockchain Interface, Telemetry Ingestion (ultra-low latency), Smart Contract Interaction Layer

```
Rationale:
- Memory safety without garbage collection — critical for cryptographic operations
- Zero-cost abstractions — same performance as C for telemetry critical paths
- Ideal for Polygon CDK interaction where correctness is paramount
- Growing ecosystem for blockchain tooling (ethers-rs)
```

Key Libraries: `ethers-rs`, `tokio`, `axum`, `serde`, `opentelemetry-rust`, `sqlx`

### 3.5 Java + Spring Boot
**Services:** Enterprise Logistics Service, ERP/POS Integration Layer, Billing Engine, SAP/Sage Adapter

```
Rationale:
- Dominant enterprise integration ecosystem (Spring Integration, Apache Camel)
- Native compatibility with SAP, Sage, and legacy ERP systems
- Mature billing and financial calculation libraries
- Battle-tested for high-volume transactional workloads
```

Key Libraries: `spring-boot`, `spring-integration`, `spring-kafka`, `hibernate`, `apache-camel`, `jasper-reports`

### 3.6 Elixir + Phoenix
**Services:** Real-Time WebSocket Service, Driver Location Broadcasting, Live Order Tracking, Communications Pub/Sub

```
Rationale:
- Erlang VM (BEAM) — millions of persistent lightweight processes
- Phoenix Channels — WebSocket connections at massive scale
- Fault-tolerant supervision trees — self-healing services
- Ideal for the real-time backbone of a delivery platform
```

Key Libraries: `phoenix`, `phoenix_live_view`, `broadway` (Kafka consumer), `ecto`, `oban` (background jobs)

---

## 4. Data Layer

| Database | Hosted Via | Type | Primary Use Cases |
|---|---|---|---|
| PostgreSQL | Supabase | Relational | Users, drivers, orders, contracts, compliance records |
| MongoDB | MongoDB Atlas | Document | Delivery event logs, menu data, partner records, unstructured |
| Redis | Upstash | Cache/Queue | Session state, rate limiting, BullMQ jobs, pub/sub |
| TimescaleDB | Supabase extension | Time-Series | IoT telemetry, vehicle health, carbon tracking, metrics |
| Elasticsearch | AWS OpenSearch | Search | Menu search, driver discovery, full-text order search |
| Pinecone | Pinecone Cloud | Vector | RAG embeddings, semantic search, LLM context retrieval |

---

## 5. AI & Agent Frameworks

| Framework | Role | Key Agents |
|---|---|---|
| LangChain | LLM orchestration, RAG, document processing | Partner onboarding agent, Menu extraction pipeline, Driver FAQ agent |
| LangGraph | Stateful multi-step decision workflows | Dispatch decision graph, Fraud investigation workflow, Risk scoring pipeline |
| CrewAI | Multi-agent coordinated task crews | Demand forecasting crew, Route optimisation crew, ESG report crew |
| AWS Bedrock | Foundation model hosting | Claude (primary LLM), Amazon Titan (embeddings) |
| AWS SageMaker | Custom model training + inference | Driver performance scoring, demand forecasting, anomaly detection |
| Pinecone | Vector database | All RAG retrieval, semantic similarity, historical delivery context |

---

## 6. Cloud & Infrastructure

**Cloud Provider:** AWS (100%)  
**Primary Region:** `af-south-1` (Cape Town) | **DR Region:** `eu-west-1` (Ireland)

| Service | Purpose |
|---|---|
| AWS EKS | Production Kubernetes cluster |
| AWS MSK | Managed Apache Kafka |
| AWS SageMaker | ML model training and inference |
| AWS Rekognition | Facial recognition (driver verification) |
| AWS Cognito | API and mobile authentication |
| AWS S3 + CloudFront | Static assets, media, CDN |
| AWS Route 53 | DNS — `lastmilegig.aagais.co.za` |
| AWS WAF + Shield Advanced | DDoS and application-layer protection |
| AWS Secrets Manager | Centralised credential management |
| AWS CloudTrail | Audit trail for all API calls |
| AWS Lambda | Serverless event handlers, webhooks |
| AWS SQS + SNS | Async messaging, fan-out notifications |

**Self-Hosted on AWS EC2:**
- Coolify (internal deployment UI and staging environments)
- HashiCorp Vault (secrets management)
- SonarQube (code quality)

---

## 7. Messaging & Streaming

| Technology | Provider | Use Case |
|---|---|---|
| Apache Kafka | AWS MSK | Primary event streaming backbone |
| Apache Flink | Self-hosted on EKS | Real-time stream processing, windowed aggregations |
| BullMQ | Upstash Redis | Background job queues (email sends, report generation) |
| Elixir Phoenix Channels | Self-hosted | WebSocket pub/sub for live tracking |
| AWS SQS | AWS | Dead-letter queues, reliable async messaging |
| AWS SNS | AWS | Fan-out notifications to multiple subscribers |

---

## 8. Observability & Reliability

| Tool | Category | Provider |
|---|---|---|
| Grafana | Dashboards | Self-hosted on EKS |
| Prometheus | Metrics collection | Self-hosted on EKS |
| OpenTelemetry | Instrumentation SDK | All services |
| Loki | Log aggregation | Grafana Cloud / self-hosted |
| Tempo | Distributed tracing | Grafana Cloud / self-hosted |
| Jaeger | Trace analysis | Self-hosted on EKS |
| Sentry | Error tracking | Sentry Cloud |
| Datadog | APM + infrastructure | Datadog Cloud |
| PagerDuty | Incident management | PagerDuty Cloud |
| AWS CloudWatch | AWS-native monitoring | AWS |
| AWS Fault Injection | Chaos engineering | AWS |

---

## 9. Security Stack

| Control | Technology |
|---|---|
| Identity & Auth | Auth0 (OAuth2, SSO, MFA) + AWS Cognito |
| Secrets | HashiCorp Vault + AWS Secrets Manager |
| Encryption at Rest | AES-256 (Supabase, MongoDB Atlas, S3) |
| Encryption in Transit | TLS 1.3 + Istio mTLS |
| Biometric Auth | AWS Rekognition (facial) + custom voice ID |
| API Security | AWS WAF, rate limiting (Upstash Redis), API key rotation |
| Dependency Scanning | Snyk |
| Static Analysis | SonarQube |
| DAST | OWASP ZAP |
| IaC Security | Checkov |
| Audit Trail | AWS CloudTrail + Polygon CDK immutable ledger |

---

## 10. DevOps & CI/CD

| Tool | Role |
|---|---|
| Terraform + Terragrunt | IaC — all AWS resources provisioned as code |
| Helm | Kubernetes package management |
| ArgoCD | GitOps CD — declarative delivery from Git |
| GitHub Actions | CI — build, test, lint, security scan |
| Coolify | Internal staging and preview deployments |
| Checkov | IaC security scanning in CI |
| Docker | All services containerised |
| Karpenter | EKS node autoscaling |
| Istio | Service mesh — mTLS, traffic management, circuit breaking |

---

## 11. Payment Stack

| Gateway | Market | Primary Use |
|---|---|---|
| Paystack | South Africa + Nigeria | Driver payouts, customer payments |
| Stripe | International | Corporate billing, SaaS subscriptions |
| Flutterwave | Pan-African | Future market expansion |
| Peach Payments | South Africa | High-value enterprise transactions |
| Ozow | South Africa | Driver instant EFT payouts |
| SnapScan / MoMo | South Africa | Customer QR code payments |
| Polygon CDK | Blockchain | Smart contract payouts, SLA settlements |

---

## 12. CMS & Media

| Tool | Purpose |
|---|---|
| Sanity v3 | Corporate content, restaurant menu CMS, partner storefronts |
| Cloudinary | Image and video CDN — restaurant photos, driver avatars |
| AWS S3 | Raw asset storage and backup |
| AWS CloudFront | Global CDN delivery of all media |

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
