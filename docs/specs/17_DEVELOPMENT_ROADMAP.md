# DEVELOPMENT ROADMAP — 300+ PHASES
**Document:** 17 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## Roadmap Principles

1. **Atomic phases** — each phase is a single, independently testable, independently deployable change
2. **Incremental value** — every phase adds measurable functionality to the running system
3. **Foundation first** — infrastructure before application, schema before service, service before UI
4. **Security at every phase** — no phase skips its security controls
5. **Test with the code** — tests are written in the same phase as the feature

---

## PHASE GROUP A — FOUNDATION & INFRASTRUCTURE (P001–P030)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P001 | Monorepo Initialisation | Nx, Node.js | Nx monorepo scaffold with all app/lib placeholders |
| P002 | Git Branch Strategy & Protection Rules | GitHub | Branch protection on main/develop, required reviews |
| P003 | Terraform Remote State Backend | Terraform, AWS S3, DynamoDB | S3 state bucket + DynamoDB lock table |
| P004 | Terragrunt Root Configuration | Terragrunt | Root HCL with multi-env support |
| P005 | AWS VPC & Multi-AZ Networking | Terraform, AWS VPC | VPC, 3 private subnets, 3 public subnets, NAT GW |
| P006 | Security Groups & NACLs | Terraform, AWS | Baseline security group rules for all services |
| P007 | AWS EKS Cluster Provisioning | Terraform, AWS EKS | Kubernetes 1.30 cluster in af-south-1 |
| P008 | EKS Node Group — Baseline | Terraform, EKS | m6i.xlarge managed node group (min 3) |
| P009 | Karpenter Autoscaler Installation | Helm, Karpenter | Node autoscaling active on EKS |
| P010 | Istio Service Mesh Installation | Helm, Istio | Istio installed, mTLS STRICT on lmg-core namespace |
| P011 | Kubernetes Namespace Structure | kubectl, YAML | All 14 namespaces created with resource quotas |
| P012 | ArgoCD Installation & Configuration | Helm, ArgoCD | GitOps CD active, connected to GitHub repo |
| P013 | ArgoCD Application CRDs — All Services | ArgoCD YAML | All service Application manifests created (placeholder) |
| P014 | Coolify on EC2 — Provision Instance | Terraform, EC2 | t3.medium EC2 with Coolify installed |
| P015 | Coolify — Staging Environment Config | Coolify | Staging environment connected to GitHub |
| P016 | AWS Route 53 — Primary Zone Setup | Terraform, Route 53 | lastmilegig.aagais.co.za hosted zone |
| P017 | AWS Route 53 — Subdomain Records | Terraform, Route 53 | All subdomains: ops, admin, command, api, dev, ws |
| P018 | AWS ACM — TLS Certificates | Terraform, ACM | Wildcard cert for *.lastmilegig.aagais.co.za |
| P019 | AWS CloudFront — Asset CDN | Terraform, CloudFront | CDN distribution pointing to S3 assets bucket |
| P020 | AWS S3 — Bucket Architecture | Terraform, S3 | assets, backups, artifacts, logs, terraform-state buckets |
| P021 | AWS WAF — Core Rule Groups | Terraform, WAF | OWASP Common Rule Set + rate limiting rules |
| P022 | AWS Shield Advanced Activation | Terraform, Shield | DDoS protection enabled on all ALBs |
| P023 | HashiCorp Vault — EKS Deployment | Helm, Vault | 3-node Vault HA cluster on EKS |
| P024 | Vault — Secret Engines & Auth Methods | Vault CLI | kv-v2, transit, pki, database, kubernetes auth |
| P025 | AWS MSK — Kafka Cluster | Terraform, MSK | 3-broker Kafka cluster, kafka.m5.xlarge |
| P026 | Kafka Topic Architecture | Terraform, MSK | All lmg.* topics created with retention policies |
| P027 | AWS OpenSearch — Cluster | Terraform, OpenSearch | r6g.large.search, 2 shards, af-south-1 |
| P028 | OpenSearch — Index Mappings | Python script | menus, drivers, orders indices created |
| P029 | Supabase — Project Initialisation | Supabase CLI | Production project created, af-south-1 region |
| P030 | Supabase — TimescaleDB Extension | SQL migration | TimescaleDB enabled, vehicle_telemetry hypertable |

---

## PHASE GROUP B — OBSERVABILITY STACK (P031–P050)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P031 | Prometheus Installation | Helm, Prometheus | Prometheus deployed in lmg-monitoring |
| P032 | Prometheus — ServiceMonitor CRDs | YAML | ServiceMonitor configs for all namespaces |
| P033 | Grafana Installation | Helm, Grafana | Grafana deployed, Prometheus datasource connected |
| P034 | Grafana — Platform Overview Dashboard | Grafana JSON | Live orders, drivers, revenue, error rate panels |
| P035 | Loki Installation & Log Collection | Helm, Loki | Loki deployed, Promtail collecting all pod logs |
| P036 | Tempo Installation | Helm, Tempo | Tempo deployed, trace storage configured |
| P037 | Jaeger Installation | Helm, Jaeger | Jaeger deployed, query UI accessible |
| P038 | OpenTelemetry Collector — DaemonSet | Helm, OTel | OTel collector deployed, exporting to Tempo + Loki |
| P039 | Grafana — Log & Trace Dashboards | Grafana | Loki log explorer, Tempo trace search panels |
| P040 | Sentry Project Setup | Sentry SDK | Sentry DSNs created for all services |
| P041 | Datadog Agent — EKS DaemonSet | Helm, Datadog | Datadog agent deployed, infrastructure metrics flowing |
| P042 | PagerDuty — Service & Escalation Setup | PagerDuty API | Services, escalation policies, on-call schedules |
| P043 | Grafana — PagerDuty Alert Rules | Grafana Alerting | P1/P2/P3/P4 alert rules routing to PagerDuty |
| P044 | AWS CloudWatch — Custom Dashboards | CloudWatch | AWS resource dashboards: EKS, MSK, OpenSearch |
| P045 | AWS CloudWatch Synthetics — Uptime | CloudWatch | Canary checks on all public endpoints every 5 min |
| P046 | Grafana — Infrastructure Dashboard | Grafana | EKS node utilisation, Kafka lag, pod health |
| P047 | Grafana — Payment Gateway Dashboard | Grafana | Transaction volume, failure rate per gateway |
| P048 | Grafana — Driver Health Dashboard | Grafana | Active drivers by zone, performance scores |
| P049 | Grafana — ESG Dashboard (skeleton) | Grafana | Carbon kg/day, EV %, placeholder panels |
| P050 | Chaos Engineering — First Experiment | AWS FIS | Kill 1 API Gateway pod, validate resilience |

---

## PHASE GROUP C — SECURITY & COMPLIANCE INFRASTRUCTURE (P051–P070)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P051 | GitHub Actions — Base CI Pipeline | GitHub Actions | Build + test + lint pipeline for TypeScript services |
| P052 | Snyk Integration — Dependency Scanning | Snyk, GitHub Actions | Snyk scan on every PR, blocks HIGH/CRITICAL |
| P053 | SonarQube — Self-Hosted on Coolify | Docker, SonarQube | SonarQube running on Coolify, GitHub webhook |
| P054 | SonarQube — Quality Gate Configuration | SonarQube | Coverage ≥ 80%, no new Critical code smells |
| P055 | Checkov — IaC Scanning in CI | GitHub Actions | Checkov scan on all Terraform changes |
| P056 | OWASP ZAP — Staging DAST Scan | GitHub Actions, ZAP | Automated DAST on every staging deployment |
| P057 | Auth0 — Tenant Setup | Auth0 | Production + development tenants configured |
| P058 | Auth0 — Application Configurations | Auth0 | SPAs, M2M clients, API configurations |
| P059 | Auth0 — RBAC Rules & Permissions | Auth0 | All roles + permissions configured |
| P060 | AWS Cognito — Driver & M2M Pools | Terraform, Cognito | Driver user pool + M2M app client |
| P061 | JWT Validation Middleware — NestJS | TypeScript | Reusable JWT guard for all NestJS services |
| P062 | API Key Management — Foundation | NestJS, Supabase | API key generation, hashing, validation |
| P063 | Rate Limiting — Upstash Redis Middleware | TypeScript, Upstash | Sliding window rate limiter middleware |
| P064 | Vault — Dynamic Database Credentials | Vault, Supabase | Short-lived PostgreSQL credentials via Vault |
| P065 | AWS KMS — Key Setup for All Resources | Terraform, KMS | Per-resource KMS keys with rotation enabled |
| P066 | POPIA Consent Management — Schema | SQL migration | consent_records table, consent_type enum |
| P067 | POPIA Consent UI Component | Next.js, React | Reusable consent modal with plain-language copy |
| P068 | Data Erasure Endpoint | NestJS | POST /v1/users/me/data-deletion — 30-day SLA |
| P069 | Audit Log — Schema & Write Service | NestJS, Supabase | audit_log table, AuditLogService injectable |
| P070 | Biometric Vault Setup | Vault, Transit Engine | biometric/ path in Vault, access policies |

---

## PHASE GROUP D — CORE DATABASE SCHEMAS (P071–P090)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P071 | Supabase — Users Table + RLS | SQL migration | users table, roles enum, RLS policies |
| P072 | Supabase — Drivers Table + RLS | SQL migration | drivers table, driver_status enum, RLS |
| P073 | Supabase — Partners Table + RLS | SQL migration | partners table, partner_type enum, RLS |
| P074 | Supabase — Vehicles Table | SQL migration | vehicles table, vehicle_type enum |
| P075 | Supabase — Orders Table + RLS | SQL migration | orders table, order_status enum, RLS |
| P076 | Supabase — Payments Table | SQL migration | payments table, gateway enum |
| P077 | Supabase — SLA Contracts Table | SQL migration | sla_contracts table |
| P078 | Supabase — Audit Log Table | SQL migration | audit_log table with indexes |
| P079 | Supabase — Realtime Subscriptions Setup | Supabase | Realtime enabled on orders, drivers tables |
| P080 | MongoDB Atlas — Delivery Events Collection | MongoDB | delivery_events collection + indexes |
| P081 | MongoDB Atlas — Menus Collection | MongoDB | menus collection + text indexes |
| P082 | MongoDB Atlas — Agent Runs Collection | MongoDB | agent_runs collection + TTL index (90 days) |
| P083 | MongoDB Atlas — Partner Analytics Collection | MongoDB | partner_analytics pre-aggregated collection |
| P084 | Upstash Redis — Key Namespace Documentation | Docs | Redis key namespaces defined and documented |
| P085 | TimescaleDB — vehicle_telemetry Hypertable | SQL migration | Hypertable + continuous aggregate + retention |
| P086 | TimescaleDB — carbon_events Hypertable | SQL migration | Carbon tracking hypertable |
| P087 | Supabase — DB Functions & Triggers | SQL | updated_at trigger, soft delete function |
| P088 | Database Migration Pipeline | GitHub Actions | Migration runs as init container on deploy |
| P089 | Supabase — Full-Text Search Indexes | SQL | pg_trgm indexes on searchable fields |
| P090 | Database Connection Pool — All Services | PgBouncer config | Connection pooling configured for all services |

---

## PHASE GROUP E — AUTH & API GATEWAY (P091–P110)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P091 | Auth Service — NestJS Scaffold | NestJS, TypeScript | Service scaffold with module structure |
| P092 | Auth Service — Auth0 JWT Validation | NestJS, Auth0 | JWT validation middleware + strategy |
| P093 | Auth Service — Refresh Token Flow | NestJS | Token refresh endpoint with rotation |
| P094 | Auth Service — User Registration | NestJS, Supabase | POST /auth/register creates user in Supabase |
| P095 | Auth Service — Login & Session | NestJS | POST /auth/login → JWT + refresh token |
| P096 | Auth Service — RBAC Guards | NestJS | @Roles() decorator + RolesGuard |
| P097 | Auth Service — API Key CRUD | NestJS | Generate, list, revoke API keys for Developer Portal |
| P098 | Auth Service — Audit Logging | NestJS | All auth events written to audit_log |
| P099 | Auth Service — Unit Tests | Jest | 85%+ coverage on auth service |
| P100 | Auth Service — Docker + Helm Chart | Docker, Helm | Containerised, Helm chart with HPA |
| P101 | API Gateway — NestJS Scaffold | NestJS, TypeScript | API Gateway scaffold with routing module |
| P102 | API Gateway — Route Configuration | NestJS | All service routes declared and proxied |
| P103 | API Gateway — JWT Middleware | NestJS | Global JWT validation + role extraction |
| P104 | API Gateway — Rate Limiting | NestJS, Upstash | Per-IP and per-API-key rate limiting |
| P105 | API Gateway — OpenAPI Spec Generation | NestJS Swagger | Auto-generated OpenAPI 3.1 spec at /docs |
| P106 | API Gateway — Request Logging | NestJS, OTel | All requests logged with trace_id correlation |
| P107 | API Gateway — Health & Ready Endpoints | NestJS | /health and /ready endpoints for Kubernetes probes |
| P108 | API Gateway — CORS Configuration | NestJS | CORS whitelist for all approved origins |
| P109 | API Gateway — Unit Tests | Jest | 80%+ coverage |
| P110 | API Gateway — Docker + Helm + ArgoCD | Docker, Helm, ArgoCD | Deployed to staging via ArgoCD |

---

## PHASE GROUP F — DRIVER ECOSYSTEM (P111–P145)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P111 | Driver Service — NestJS Scaffold | NestJS | Service scaffold |
| P112 | Driver Service — Registration Endpoint | NestJS, Supabase | POST /drivers/register |
| P113 | Driver Service — Profile CRUD | NestJS, Supabase | GET/PATCH /drivers/:id |
| P114 | Driver Service — Status Management | NestJS, Kafka | PATCH /drivers/:id/status + Kafka event |
| P115 | Driver Service — Zone & Availability | NestJS | GET /drivers/available?zone=KZN-North |
| P116 | Driver Onboarding — Biometric Capture Flow | NestJS, Vault | Capture → liveness → store in Vault |
| P117 | Driver Onboarding — AWS Rekognition Integration | Python, Rekognition | Liveness detection + face template creation |
| P118 | Driver Onboarding — Licence Extraction | Python, LangChain | PDF/image licence → structured data |
| P119 | Driver Onboarding — Paystack Bank Verify | NestJS, Paystack | Bank account verification before activation |
| P120 | Driver Onboarding — POPIA Consent Flow | NestJS | Consent recording + audit log |
| P121 | Driver Mobile App — Scaffold | React Native, Expo | Expo Router scaffold with tab navigation |
| P122 | Driver Mobile App — Auth Flow | React Native, Auth0 | Login + biometric shift-start verification |
| P123 | Driver Mobile App — Dashboard Screen | React Native | Earnings summary + active delivery card |
| P124 | Driver Mobile App — Delivery Queue | React Native | Available deliveries list with accept/reject |
| P125 | Driver Mobile App — Active Delivery Nav | React Native, Maps | Navigation map with live route |
| P126 | Driver Mobile App — Delivery Confirmation | React Native | Photo capture + geo-tag + confirm delivery |
| P127 | Driver Mobile App — Earnings Screen | React Native | Earnings history + wallet balance |
| P128 | Driver Wallet — Angular Dashboard | Angular | Earnings dashboard with charts |
| P129 | Driver Wallet — Instant Payout (Ozow) | Java, Ozow API | Instant EFT payout trigger |
| P130 | Driver Wallet — Tax Certificate | Java, JasperReports | Annual PDF tax certificate generation |
| P131 | Driver Performance Scoring — SageMaker Setup | Python, SageMaker | Training pipeline + endpoint deployment |
| P132 | Driver Performance Scoring — Score Endpoint | Python | POST /ai/driver-score/:id |
| P133 | Driver Performance Scoring — Weekly Cron | BullMQ | Scheduled weekly rescore for all drivers |
| P134 | Driver Performance — Tier Badges | NestJS, Angular | Tier calculation + badge display in app |
| P135 | Driver Service — Unit + Integration Tests | Jest | 80%+ coverage |
| P136 | Driver Service — Docker + Helm | Docker, Helm | Containerised, Helm chart |
| P137 | Driver Mobile App — Push Notifications | Expo, Firebase | Firebase push notifications for order alerts |
| P138 | Driver Mobile App — Offline Mode | React Native | Queue actions when offline, sync on reconnect |
| P139 | Driver Mobile App — E2E Tests | Detox | Critical flows: login, accept delivery, confirm |
| P140 | Driver Onboarding — Partner Onboarding Crew | CrewAI | Document review + compliance check + approval |
| P141 | Fleet Management — Scooter Inventory | NestJS, Supabase | Vehicle CRUD, availability status |
| P142 | Fleet Management — Rental Booking | NestJS | POST /fleet/rentals — assign scooter to driver |
| P143 | Fleet Management — IoT Device Registration | NestJS | Register IoT device ID to vehicle record |
| P144 | Fleet Servicing — Bosch API Integration | NestJS | Schedule service appointments |
| P145 | Fleet Servicing — Supa Quick API Integration | NestJS | Tyre and emergency maintenance bookings |

---

## PHASE GROUP G — ORDER & DISPATCH (P146–P175)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P146 | Order Service — NestJS Scaffold | NestJS | Service scaffold |
| P147 | Order Service — Place Order Endpoint | NestJS, Supabase, Kafka | POST /orders → order.placed event |
| P148 | Order Service — Order Status CRUD | NestJS | PATCH /orders/:id/status |
| P149 | Order Service — Customer Order History | NestJS | GET /orders/customer/:id |
| P150 | Order Service — Delivery Confirmation | NestJS, Kafka | POST /orders/:id/verify-delivery |
| P151 | Order Service — Geo-Tag Verification | NestJS | Validate delivery GPS within 100m of address |
| P152 | Order Service — Blockchain Trigger | NestJS, Kafka | Publish to lmg.orders.delivered → blockchain queue |
| P153 | Order Service — Unit + Integration Tests | Jest | 80%+ coverage |
| P154 | Dispatch Engine — Go Service Scaffold | Go | Go service with gin HTTP + goroutine pool |
| P155 | Dispatch Engine — Kafka Consumer | Go, Kafka | Consume lmg.orders.placed |
| P156 | Dispatch Engine — Driver Pool Query | Go, Upstash | Query available drivers from Redis |
| P157 | Dispatch Engine — Scoring Algorithm (v1) | Go | Rule-based scoring (distance + rating + tier) |
| P158 | Dispatch Engine — AI Route Query | Go, gRPC | gRPC call to AI inference for route optimisation |
| P159 | Dispatch Engine — LangGraph Integration | Python, LangGraph | LangGraph dispatch decision graph |
| P160 | Dispatch Engine — HITL Gate | Python, Angular | Low-confidence decisions surfaced in Command Centre |
| P161 | Dispatch Engine — Publish Dispatch Event | Go, Kafka | lmg.orders.dispatched event to Kafka |
| P162 | Dispatch Engine — Dispatch Lock (Redis) | Go, Upstash | Redis lock prevents double-dispatch |
| P163 | Dispatch Engine — Unit Tests | Go test | 80%+ coverage |
| P164 | Dispatch Engine — Docker + Helm | Docker, Helm | Containerised, Helm chart with HPA |
| P165 | Real-Time Tracking — Elixir Scaffold | Elixir, Phoenix | Phoenix app with Channels scaffold |
| P166 | Tracking — Driver Location Channel | Elixir | "driver:#{id}" channel for GPS push |
| P167 | Tracking — Order Tracking Channel | Elixir | "order:#{id}" channel for customer subscription |
| P168 | Tracking — Ops Global Channel | Elixir | "ops:global" channel for Command Centre |
| P169 | Tracking — Location to Kafka | Elixir, Broadway | Broadcast GPS events to lmg.drivers.location |
| P170 | Tracking — Driver Mobile App Integration | React Native | Driver app pushes GPS every 5s over WebSocket |
| P171 | Tracking — Customer Live Map | Next.js, Mapbox | Live driver pin on customer order tracking page |
| P172 | Tracking — Command Centre Map | Angular, Mapbox | All active deliveries on Command Centre map |
| P173 | Tracking — Elixir Clustering | Elixir, libcluster | 3-node BEAM cluster for HA WebSocket |
| P174 | Tracking — Unit + Integration Tests | ExUnit | 80%+ coverage |
| P175 | Tracking — Docker + Helm | Docker, Helm | Containerised, Helm chart |

---

## PHASE GROUP H — RESTAURANT STOREFRONTS (P176–P205)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P176 | Sanity CMS — Project Setup | Sanity | Sanity project with restaurant schema |
| P177 | Sanity — Restaurant Schema | Sanity | restaurant, menuCategory, menuItem documents |
| P178 | Sanity — Cloudinary Asset Plugin | Sanity | cloudinary.asset field in menuItem |
| P179 | Sanity — Partner Admin Studio | Sanity | Embedded Sanity Studio at /partner/menu |
| P180 | Storefront Service — NestJS Scaffold | NestJS | Service scaffold |
| P181 | Storefront Service — Restaurant CRUD | NestJS, MongoDB | GET/POST/PATCH /restaurants |
| P182 | Storefront Service — Sanity Webhook | NestJS | POST /partners/:id/menu/sync → MongoDB update |
| P183 | Storefront Service — Menu Endpoints | NestJS | GET /restaurants/:slug/menu |
| P184 | Storefront Service — Order Intake | NestJS, Kafka | POST /restaurants/:slug/orders |
| P185 | Storefront Service — Partner Analytics | NestJS, MongoDB | GET /partners/:id/analytics aggregation |
| P186 | Next.js — Storefront Page (SSR) | Next.js | /store/[slug] SSR page with ISR |
| P187 | Storefront — StorefrontHero Component | Next.js | Restaurant hero with opening status |
| P188 | Storefront — MenuCategoryNav Component | Next.js | Sticky category navigation |
| P189 | Storefront — MenuItemCard Component | Next.js | Item card with Cloudinary image + add to cart |
| P190 | Storefront — CartDrawer Component | Next.js, Zustand | Slide-out cart with item management |
| P191 | Storefront — Checkout Flow | Next.js | Address → Payment → Confirmation steps |
| P192 | Storefront — Payment Integration (Paystack) | Next.js, Paystack | Paystack popup in checkout |
| P193 | Storefront — Order Tracking Page | Next.js, WebSocket | /store/[slug]/order/[id]/track |
| P194 | Storefront — Partner Directory | Next.js | /store directory with search + filters |
| P195 | Storefront — OpenSearch Menu Search | Next.js, OpenSearch | Search bar querying OpenSearch menus index |
| P196 | Storefront — Partner Admin Dashboard | Next.js | /partner/dashboard with revenue overview |
| P197 | Storefront — Partner Order Queue | Next.js, WebSocket | Live order queue with real-time updates |
| P198 | Storefront — Partner Analytics Dashboard | Next.js, Chart.js | Revenue charts, peak hours, popular items |
| P199 | Storefront — Menu Extraction AI (LangChain) | Python, LangChain | PDF menu upload → structured menu items |
| P200 | Storefront — SEO Meta Tags | Next.js | Dynamic OG tags, restaurant schema.org markup |
| P201 | Storefront Service — Unit Tests | Jest | 80%+ coverage |
| P202 | Storefront Service — Docker + Helm | Docker, Helm | Containerised, deployed to staging |
| P203 | Storefront — Playwright E2E Tests | Playwright | Place order, track delivery critical flow |
| P204 | Storefront — Performance Optimisation | Next.js, Cloudinary | Lighthouse ≥ 90, WebP images, lazy loading |
| P205 | Storefront — Partner Onboarding Flow | Next.js | Multi-step partner signup + document upload |

---

## PHASE GROUP I — PAYMENTS (P206–P225)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P206 | Payment Service — Java/Spring Boot Scaffold | Java, Spring Boot | Service scaffold with Maven structure |
| P207 | Payment Service — Paystack Integration | Java, Paystack API | Charge initiation + webhook verification |
| P208 | Payment Service — Stripe Integration | Java, Stripe SDK | Invoice creation + payment intent |
| P209 | Payment Service — Ozow Integration | Java, Ozow API | Instant EFT payout endpoint |
| P210 | Payment Service — Peach Payments | Java, Peach API | High-value enterprise payment processing |
| P211 | Payment Service — Flutterwave | Java, Flutterwave | Pan-African multi-currency support |
| P212 | Payment Service — Gateway Selection Logic | Java | Context-based gateway router |
| P213 | Payment Service — Webhook Receiver | NestJS | POST /v1/webhooks/* with HMAC verification |
| P214 | Payment Service — Kafka Consumer | Java, Kafka | Consume lmg.orders.delivered → trigger payout |
| P215 | Payment Service — Driver Payout Flow | Java, Ozow | Commission deduction + driver payout |
| P216 | Payment Service — Reconciliation Engine | Java, JasperReports | Daily reconciliation job + PDF report |
| P217 | Payment Service — Refund Processing | Java | POST /payments/refund/:id |
| P218 | Payment Service — Invoice Generation | Java, JasperReports | PDF invoice with Lastmile Gig branding |
| P219 | Payment Service — Unit Tests | JUnit 5 | 85%+ coverage |
| P220 | Payment Service — Docker + Helm | Docker, Helm | Containerised, deployed to staging |
| P221 | Smart Contract — Hardhat Setup | Hardhat, Solidity | Hardhat project with test framework |
| P222 | Smart Contract — DeliveryVerification.sol | Solidity | Contract written + full test coverage |
| P223 | Smart Contract — DriverPayout.sol | Solidity | Escrow contract written + full test coverage |
| P224 | Smart Contract — PartnerSLA.sol | Solidity | SLA contract written + full test coverage |
| P225 | Smart Contract — Testnet Deployment | Hardhat, Polygon CDK | Contracts deployed to Polygon CDK testnet |

---

## PHASE GROUP J — BLOCKCHAIN & SECURITY LAYER (P226–P245)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P226 | Blockchain Service — Rust Scaffold | Rust, Axum | Rust service with axum HTTP + tokio runtime |
| P227 | Blockchain Service — ethers-rs Client | Rust, ethers-rs | Polygon CDK client initialised with signing wallet |
| P228 | Blockchain Service — Record Delivery | Rust | POST /blockchain/delivery → on-chain write |
| P229 | Blockchain Service — Verify Delivery | Rust | GET /blockchain/delivery/:id → on-chain read |
| P230 | Blockchain Service — Driver Payout Trigger | Rust | POST /blockchain/payout → smart contract call |
| P231 | Blockchain Service — SLA Breach Record | Rust | POST /blockchain/sla/breach |
| P232 | Blockchain Service — Kafka Consumer | Rust | Consume lmg.orders.delivered → write to chain |
| P233 | Blockchain Service — The Graph Subgraph | AssemblyScript | Subgraph indexing DeliveryVerification events |
| P234 | The Graph — Deploy to Hosted Service | The Graph CLI | Subgraph live, queryable via GraphQL |
| P235 | Blockchain Service — DFI Audit Endpoint | Rust, NestJS | GET /audit/deliveries → blockchain-verified report |
| P236 | Blockchain Service — Unit Tests | Rust test | 90%+ coverage |
| P237 | Blockchain Service — Docker + Helm | Docker, Helm | Containerised, deployed to staging |
| P238 | Smart Contract — Mainnet Deployment | Hardhat, Polygon CDK | Contracts deployed to production Polygon CDK |
| P239 | Admin Module — Blockchain Audit Dashboard | Angular | DFI audit dashboard querying The Graph |
| P240 | Blockchain — POPIA Hash-only Verification | Audit | Legal confirmation that hashed IDs ≠ PII |
| P241 | IoT Service — Rust Scaffold | Rust, Axum | Rust IoT ingestion service scaffold |
| P242 | IoT Service — MQTT Listener | Rust, rumqtt | MQTT subscriber for vehicle telemetry |
| P243 | IoT Service — TimescaleDB Writer | Rust, sqlx | Batch-insert telemetry to TimescaleDB |
| P244 | IoT Service — Anomaly Alert Publisher | Rust, Kafka | Publish lmg.fleet.maintenance on anomaly |
| P245 | IoT Service — Unit Tests + Docker | Rust, Docker | 85%+ coverage, containerised |

---

## PHASE GROUP K — AI & AGENTIC LAYER (P246–P270)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P246 | AI Service — Python/FastAPI Scaffold | Python, FastAPI | Service scaffold with OTel instrumentation |
| P247 | AI Service — Route Optimisation Endpoint | Python, OSRM | POST /ai/route-optimise |
| P248 | AI Service — Demand Forecast Endpoint | Python, SageMaker | POST /ai/demand-forecast |
| P249 | AI Service — Driver Score Endpoint | Python, SageMaker | POST /ai/driver-score/:id |
| P250 | AI Service — Fraud Detection Endpoint | Python, SageMaker | POST /ai/fraud-check |
| P251 | AI Service — Restaurant Recommendations | Python, LangChain | POST /ai/recommend/restaurants (RAG) |
| P252 | SageMaker — Demand Forecaster Training | Python, SageMaker | Training pipeline + Prophet+LSTM model |
| P253 | SageMaker — Driver Scorer Training | Python, SageMaker | XGBoost model trained + endpoint deployed |
| P254 | SageMaker — Fraud Detector Training | Python, SageMaker | Isolation Forest model trained + endpoint |
| P255 | LangGraph — Dispatch Decision Graph | Python, LangGraph | Full dispatch graph with HITL gate |
| P256 | LangGraph — Fraud Investigation Graph | Python, LangGraph | Multi-step fraud investigation workflow |
| P257 | LangGraph — Risk Scoring Graph | Python, LangGraph | Per-delivery risk → Naked Insurance API |
| P258 | LangChain — Driver FAQ RAG Pipeline | Python, LangChain, Pinecone | Driver FAQ RAG with Pinecone retrieval |
| P259 | LangChain — Menu Extraction Pipeline | Python, LangChain, Textract | PDF/image menu → structured Sanity schema |
| P260 | LangChain — Partner Onboarding Chain | Python, LangChain | Document extraction + validation chain |
| P261 | CrewAI — Demand Forecasting Crew | Python, CrewAI | 3-agent demand forecasting crew |
| P262 | CrewAI — Route Optimisation Crew | Python, CrewAI | 2-agent route optimisation crew |
| P263 | CrewAI — ESG Reporting Crew | Python, CrewAI | 3-agent ESG report generation crew |
| P264 | CrewAI — Partner Onboarding Crew | Python, CrewAI | 3-agent onboarding approval crew |
| P265 | Pinecone — Index Setup & Embedding Pipelines | Python, Pinecone | All 5 indices created, embedding pipelines running |
| P266 | AWS Bedrock — Claude Model Configuration | Python, Boto3 | Bedrock Claude endpoint configured for all agents |
| P267 | HITL Dashboard — Angular Component | Angular | Pending approvals panel in Command Centre |
| P268 | AI Service — Unit + Integration Tests | Pytest | 80%+ coverage |
| P269 | AI Service — Docker + Helm | Docker, Helm | Containerised, deployed to staging |
| P270 | Agent Monitoring — LangSmith Integration | LangSmith | All agent traces visible in LangSmith |

---

## PHASE GROUP L — ENTERPRISE LOGISTICS & ESG (P271–P285)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P271 | Logistics Service — Java/Spring Boot Scaffold | Java | Service scaffold |
| P272 | Logistics — Takealot API Integration | Java, REST | Shipment creation + tracking |
| P273 | Logistics — DSV API Integration | Java, SOAP/REST | Waybill creation + collection booking |
| P274 | Logistics — Courier Guy API | Java, REST | Waybill + POD retrieval |
| P275 | Logistics — Smart SLA Enforcement | Java, Polygon CDK | SLA breach detection → smart contract |
| P276 | Logistics — AI Load Balancing | Java, gRPC | gRPC call to AI service for fleet allocation |
| P277 | Logistics — Warehouse Tracking | Java, Supabase | Parcel intake, storage, dispatch tracking |
| P278 | Logistics — Unit Tests | JUnit 5 | 85%+ coverage |
| P279 | Logistics — Docker + Helm | Docker, Helm | Containerised, deployed to staging |
| P280 | ESG Module — Carbon Tracking Pipeline | Python, TimescaleDB | Per-delivery carbon calculation + storage |
| P281 | ESG Module — EV Fleet Dashboard | Angular | EV %, charge sessions, solar contribution |
| P282 | ESG Module — CrewAI ESG Report | CrewAI | Monthly ESG report generation + HITL review |
| P283 | ESG Module — DFI Report Export | Java, JasperReports | PDF ESG report in DFI-aligned format |
| P284 | ESG Module — sefa Report Template | Docs + Angular | sefa-specific ESG reporting template |
| P285 | ESG Module — Solar Charging API | Python | Solar station telemetry integration |

---

## PHASE GROUP M — COMMUNICATIONS & LOYALTY (P286–P298)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P286 | Comms Service — Elixir Scaffold | Elixir, Phoenix | Service scaffold with Oban job queue |
| P287 | Comms — Twilio SMS Integration | Elixir, Twilio | SMS dispatch for order events |
| P288 | Comms — Twilio WhatsApp Integration | Elixir, Twilio | WhatsApp notifications for drivers |
| P289 | Comms — Firebase Push Notifications | Elixir, Firebase | Push notifications for mobile apps |
| P290 | Comms — SendGrid Email Integration | Elixir, SendGrid | Transactional emails with branded templates |
| P291 | Comms — Notification Template Library | Elixir | Templates for all 12 notification event types |
| P292 | Comms — Kafka Consumer for Events | Elixir, Broadway | Consume all lmg.* events → dispatch notifications |
| P293 | Comms — Unit Tests + Docker | ExUnit, Docker | 80%+ coverage, containerised |
| P294 | Loyalty Module — Points Engine | NestJS, Upstash | Points accrual on order completion |
| P295 | Loyalty Module — Referral System | NestJS | Referral code generation + reward on conversion |
| P296 | Loyalty Module — LangChain Personalisation | Python, LangChain | AI-personalised offers based on order history |
| P297 | Loyalty Module — Next.js UI | Next.js | /rewards — points balance, offers, history |
| P298 | Loyalty Module — Unit Tests | Jest, Pytest | 80%+ coverage |

---

## PHASE GROUP N — DEVELOPER PORTAL & INSURANCE (P299–P308)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P299 | Developer Portal — NestJS Scaffold | NestJS | Portal scaffold at dev.lastmilegig.aagais.co.za |
| P300 | Developer Portal — API Key Management UI | Next.js | Self-service API key creation + management |
| P301 | Developer Portal — Swagger/Redoc Docs | NestJS, Redoc | Full API docs rendered from OpenAPI spec |
| P302 | Developer Portal — Sandbox Environment | NestJS | Sandbox API with synthetic test data |
| P303 | Developer Portal — Webhook Registration | NestJS | POST /v1/webhooks/register |
| P304 | Developer Portal — Rate Limit Dashboard | Next.js | Show usage against rate limit per API key |
| P305 | Insurance Module — Naked API Integration | NestJS, Go | Per-delivery risk score → premium API call |
| P306 | Insurance Module — Guardrisk Integration | NestJS | Fleet insurance policy management |
| P307 | Insurance Module — Claims Flow | NestJS, Angular | Driver claim submission + status tracking |
| P308 | Insurance Module — LangGraph Claims Agent | Python, LangGraph | Automated claim evidence collection + submission |

---

## PHASE GROUP O — CORPORATE LANDING & INVESTOR PORTAL (P309–P320)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P309 | Corporate Site — Next.js Scaffold | Next.js 14 | App Router scaffold with layout |
| P310 | Corporate Site — Hero Section | Next.js, Tailwind | Animated hero with brand statement |
| P311 | Corporate Site — Platform Overview | Next.js | All 21 modules interactive display |
| P312 | Corporate Site — Tech Stack Section | Next.js | Visual polyglot stack display |
| P313 | Corporate Site — Sanity CMS Integration | Next.js, Sanity | Blog, team, pages from CMS |
| P314 | Corporate Site — Partner Application Form | Next.js, NestJS | Multi-step partner signup form |
| P315 | Corporate Site — SEO Optimisation | Next.js | Sitemap, robots.txt, OG tags, schema.org |
| P316 | Corporate Site — Lighthouse ≥ 90 | Next.js | Performance + accessibility audit pass |
| P317 | Investor Portal — Protected Route | Next.js, Auth0 | Auth0-protected /investors section |
| P318 | Investor Portal — KPI Dashboard | Next.js, Supabase | Live platform KPIs for investors |
| P319 | Investor Portal — Document Downloads | Next.js, S3 | PIM, financials, ESG reports via presigned S3 URLs |
| P320 | Investor Portal — DFI Report Access | Next.js | Blockchain-verified DFI audit report download |

---

## PHASE GROUP P — HARDENING, LOAD TESTING & LAUNCH (P321–P340)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P321 | Load Testing — k6 Scripts | k6 | Load test scripts for all critical endpoints |
| P322 | Load Test — API Gateway (1000 RPS) | k6, AWS | API Gateway handles 1000 req/s, p99 < 200ms |
| P323 | Load Test — Dispatch Engine (500 orders/min) | k6, AWS | Dispatch engine handles 500 orders/min |
| P324 | Load Test — WebSocket (10k concurrent) | k6, AWS | Elixir tracking handles 10k concurrent connections |
| P325 | Load Test — Payment Service (100 RPS) | k6, AWS | Payment service handles 100 req/s without errors |
| P326 | Load Test — Storefront (2000 RPS) | k6, AWS | Restaurant storefronts handle 2000 RPS |
| P327 | Penetration Test — External (Third Party) | Third-party firm | No critical/high findings unresolved |
| P328 | Penetration Test — Remediation | Various | All pentest findings remediated |
| P329 | Chaos Test — Multi-Zone Failure | AWS FIS | Platform survives loss of 1 AZ |
| P330 | Chaos Test — Kafka Broker Failure | AWS FIS | No message loss on broker failure |
| P331 | Chaos Test — Database Failover | Supabase | Failover to read replica within 60s |
| P332 | DR Drill — Full Failover to eu-west-1 | AWS | Complete DR region failover + RTO validation |
| P333 | POPIA Compliance Audit | Internal + legal | Full audit against POPIA checklist, sign-off |
| P334 | Security Headers Audit | Mozilla Observatory | All A+ ratings on security headers |
| P335 | Final Lighthouse Audit — All Pages | Lighthouse CI | All public pages ≥ 90 performance |
| P336 | Monitoring & Alerting Final Review | Grafana, PagerDuty | All critical alerts tested, escalation chains verified |
| P337 | Runbook Documentation | Docs | Operational runbooks for all P1 scenarios |
| P338 | Bug Bounty Programme Launch | HackerOne | HackerOne programme published |
| P339 | Soft Launch — KZN Pilot | All | Platform live for limited KZN driver + partner pilot |
| P340 | Full Production Launch | All | All 21 modules live, all regions, full monitoring |

---

## PHASE GROUP Q — POST-LAUNCH ENHANCEMENTS (P341–P360+)

| Phase | Title | Stack | Deliverable |
|---|---|---|---|
| P341 | Driver DID — Phase 3 Blockchain | Rust, Solidity | DriverIdentity.sol deployed, DID issuance live |
| P342 | Pan-African Expansion — Flutterwave | Java, Flutterwave | Multi-currency payment flows for Nigeria pilot |
| P343 | EV Fleet — Solar Station Integration | Python, IoT | Solar charging station telemetry live |
| P344 | Predictive Maintenance — ML Model | Python, SageMaker | Vehicle failure prediction model deployed |
| P345 | Voice ID — Driver Verification Layer | Python, AWS | Voice biometric as second factor for high-risk zones |
| P346 | Gamification — Driver Achievement System | NestJS, Angular | Milestone badges, leaderboards, achievement unlocks |
| P347 | Demand Forecasting — Real-Time Model | Python, Kafka, Flink | Real-time (not batch) demand prediction |
| P348 | Multi-Language Support (Zulu, Afrikaans) | i18n, Next.js, Angular | SA language support in customer-facing surfaces |
| P349 | B2B Corporate API — Enterprise Tier | NestJS, OpenAPI | Dedicated enterprise API tier (unlimited, SLA-backed) |
| P350 | Operator Franchise Module | Angular, NestJS | Sub-operator zone franchise management |
| P351 | Advanced ESG — Carbon Credit Trading | Polygon CDK | Tokenised carbon credits on Polygon CDK |
| P352 | AI Customer Service Agent | LangGraph | Full customer service agent with human escalation |
| P353 | Predictive Restocking — Restaurant | CrewAI | Ingredient demand forecasting for restaurant partners |
| P354 | Drone Delivery Integration (Pilot) | NestJS, IoT | Drone dispatch pilot for select zones |
| P355 | WhatsApp Ordering — Channel | Twilio, LangChain | Order via WhatsApp using LLM intent extraction |
| P356 | USSD Ordering — Feature Phone Support | Twilio | USSD ordering for non-smartphone drivers/customers |
| P357 | Blockchain Carbon Credits | Polygon CDK, Solidity | ESG carbon credit NFTs for corporate sustainability |
| P358 | IPO Data Room | Next.js, S3 | Virtual data room for future capital markets event |
| P359 | Open API Marketplace | NestJS | Third-party app ecosystem on Developer Portal |
| P360+ | Continuous iteration and market expansion | All | Ongoing sprints per quarterly OKRs |

---

## Summary

| Phase Group | Phases | Focus |
|---|---|---|
| A — Foundation | P001–P030 | AWS infrastructure, Terraform, Kubernetes |
| B — Observability | P031–P050 | Grafana, Prometheus, OTel, PagerDuty |
| C — Security | P051–P070 | Auth, WAF, Vault, POPIA, CI security |
| D — Schemas | P071–P090 | All database schemas and migrations |
| E — Auth & Gateway | P091–P110 | Auth service + API gateway live |
| F — Driver Ecosystem | P111–P145 | Driver onboarding, app, wallet, fleet |
| G — Orders & Dispatch | P146–P175 | Order service, dispatch engine, tracking |
| H — Storefronts | P176–P205 | Restaurant storefronts, menus, partner admin |
| I — Payments | P206–P225 | All 7 gateways + smart contracts |
| J — Blockchain | P226–P245 | Blockchain service, IoT ingestion |
| K — AI & Agents | P246–P270 | LangChain, LangGraph, CrewAI, SageMaker |
| L — Logistics & ESG | P271–P285 | Enterprise logistics, ESG module |
| M — Comms & Loyalty | P286–P298 | Twilio, Firebase, SendGrid, rewards |
| N — Developer & Insurance | P299–P308 | Developer portal, insurance module |
| O — Corporate & Investors | P309–P320 | Corporate site, investor portal |
| P — Hardening & Launch | P321–P340 | Load tests, pentest, chaos, launch |
| Q — Post-Launch | P341–P360+ | Enhancements, expansion, innovation |

**Total Defined Phases: 360+ (with P360+ as ongoing continuous delivery)**

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
