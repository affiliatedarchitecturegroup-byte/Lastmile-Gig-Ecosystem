# LASTMILE GIG — MASTER OVERVIEW
**Document:** 01 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Platform Identity

**Lastmile Gig (Pty) Ltd** is the AI Singularity Operating System for South Africa's last-mile delivery industry. It is a technology subsidiary of the **Affiliated Architecture Group (AAG)**, headquartered in KwaZulu-Natal, South Africa.

> Lastmile Gig is not a delivery app. It is the operating system for South Africa's last-mile economy.

The platform sits at the intersection of five primary stakeholder groups:
- **Gig drivers** — independent contractors renting scooters and earning per delivery
- **Corporate fleet clients** — Checkers 60/60, Mr Delivery, Bolt Food, and similar operators
- **Restaurant & hospitality partners** — cafes, fast food, fine dining, hotels with branded storefronts
- **Enterprise logistics operators** — Takealot, DSV, Courier Guy, and national courier networks
- **Development finance institutions and investors** — sefa, KZN Growth Fund Agency, FNB Business Banking, Capitec Business

---

## 2. Architecture Philosophy

### 2.1 Core Principles
| Principle | Expression |
|---|---|
| **AI-First** | Intelligence is not a feature — it is the infrastructure. Every module has AI embedded at its core. |
| **Blockchain-Anchored** | Immutable delivery records, smart contract settlements, and DID for institutional trust. |
| **Microservices-Native** | Every functional domain is a independently deployable, independently scalable service. |
| **Polyglot-By-Design** | The right language for the right job. Six backend languages, each selected for domain fit. |
| **POPIA-First** | South African data sovereignty is a non-negotiable architecture constraint, not an afterthought. |
| **ESG-Embedded** | Environmental and social accountability is built into the platform data model and reporting layer. |
| **Human-in-the-Loop** | All agentic workflows require defined human approval gates at critical decision nodes. |

### 2.2 System Tiers
The 21 modules are organised into five logical system tiers:

```
TIER 1 — MARKET INTERFACE       Modules 01, 07, 15, 18
TIER 2 — BUSINESS OPERATIONS    Modules 03, 04, 05, 06, 16, 17
TIER 3 — INTELLIGENCE LAYER     Modules 02, 13
TIER 4 — TRUST INFRASTRUCTURE   Modules 08, 09
TIER 5 — GOVERNANCE & SCALE     Modules 10, 11, 12, 14, 19, 20, 21
```

---

## 3. The 21-Module Ecosystem

| # | Module | Primary Stack | Tier |
|---|---|---|---|
| 01 | Corporate Landing & Investor Relations | Next.js 14, Sanity, Auth0 | Market Interface |
| 02 | AI Orchestration Platform | Python, LangChain, CrewAI, Kafka | Intelligence |
| 03 | Driver Rental Module | Angular 17, NestJS, Paystack, IoT | Operations |
| 04 | Contracted Fleet Module | Angular 17, Go, Polygon CDK | Operations |
| 05 | Branded Fleet Module | Next.js, Java/Spring Boot, Stripe | Operations |
| 06 | Fleet Servicing Hub | Rust, TimescaleDB, IoT | Operations |
| 07 | Customer Ordering App | React Native, Expo, AWS Rekognition | Market Interface |
| 08 | Blockchain Layer | Rust, Polygon CDK, Hardhat | Trust |
| 09 | Security Layer | Auth0, Vault, WAF, Snyk | Trust |
| 10 | Enterprise Logistics | Java, Go, Kafka, Flink | Governance |
| 11 | ESG Framework | Angular, Power BI, CrewAI | Governance |
| 12 | APIs & Integrations Hub | NestJS, AWS API Gateway | Governance |
| 13 | AI & Data Intelligence | Python, SageMaker, LangGraph, Pinecone | Intelligence |
| 14 | Admin & Compliance | Angular, NestJS, Supabase | Governance |
| 15 | Restaurant Storefronts | Next.js, Sanity, Cloudinary, Elixir | Market Interface |
| 16 | Driver Earnings & Wallet | Angular, Java, Paystack, Ozow | Operations |
| 17 | Insurance & Risk | NestJS, Go, LangGraph | Operations |
| 18 | Customer Loyalty & Rewards | Next.js, Upstash, LangChain RAG | Market Interface |
| 19 | Command Centre | Angular, Go, Elixir, Grafana | Governance |
| 20 | Developer Portal & Public API | NestJS, OpenAPI, AWS API Gateway | Governance |
| 21 | Communications Hub | Twilio, Firebase, SendGrid, Elixir | Governance |

---

## 4. Platform Metrics

| Metric | Value |
|---|---|
| Total Modules | 21 |
| Estimated Codebase | ~810,000 Lines of Code |
| Development Phases | 300+ |
| Technical Documents | 19 Markdown files |
| Backend Languages | 6 (TypeScript, Python, Go, Rust, Java, Elixir) |
| Cloud Provider | AWS (100%) |
| Database Layer | Supabase (PostgreSQL) + MongoDB Atlas + Upstash Redis |
| AI Frameworks | LangChain, LangGraph, CrewAI |
| Blockchain | Polygon CDK (L2) |
| Payment Gateways | 7 (Paystack, Stripe, Flutterwave, Peach, Ozow, SnapScan, Polygon) |
| Observability Tools | 11+ (Grafana, Prometheus, OTel, Loki, Tempo, Sentry, Datadog, PagerDuty, Jaeger, CloudWatch, Chaos) |
| Compliance | POPIA + GDPR |

---

## 5. AAG Subsidiary Context

Lastmile Gig operates under the AAG umbrella, drawing directly on:
- **Institutional credibility** — AAG's established presence in KZN's built environment
- **Commercial network** — AAG's existing client relationships across architecture, civil works, and environmental management
- **Financial credibility** — AAG's track record as anchor for lending propositions to DFIs and commercial banks

The subdomain `lastmilegig.aagais.co.za` reflects this relationship, positioning Lastmile Gig as a technology arm of a credible, multi-disciplinary group.

---

## 6. Document Suite Index

This master overview is document 01 of 19. The full suite:

```
01_MASTER_OVERVIEW.md          ← This document
02_TECH_STACK.md
03_FRONTEND_SPEC.md
04_BACKEND_MICROSERVICES.md
05_AI_AGENTIC_LAYER.md
06_BLOCKCHAIN_LAYER.md
07_DATABASE_ARCHITECTURE.md
08_INFRASTRUCTURE_IaC.md
09_OBSERVABILITY.md
10_SECURITY_COMPLIANCE.md
11_PAYMENTS_FINANCIAL.md
12_API_INTEGRATION_SPEC.md
13_DEVOPS_CICD.md
14_RESTAURANT_STOREFRONT_SPEC.md
15_DRIVER_ECOSYSTEM_SPEC.md
16_ESG_SUSTAINABILITY.md
17_DEVELOPMENT_ROADMAP.md
18_AGENTIC_DEV_STANDARDS.md
19_LOC_ESTIMATION.md
```

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
