# Lastmile Gig Ecosystem

**The AI Singularity Operating System for South Africa's Last-Mile Delivery Industry**

[![Build Status](https://img.shields.io/badge/build-in_progress-yellow)]()
[![LoC](https://img.shields.io/badge/target_LoC-810%2C000%2B-blue)]()
[![Languages](https://img.shields.io/badge/languages-6_backend-green)]()
[![Modules](https://img.shields.io/badge/modules-21-orange)]()

---

## Overview

Lastmile Gig (Pty) Ltd is a technology subsidiary of the Affiliated Architecture Group (AAG), headquartered in KwaZulu-Natal, South Africa. This platform serves five primary stakeholder groups:

- **Gig Drivers** - Independent contractors renting scooters and earning per delivery
- **Corporate Fleet Clients** - Checkers 60/60, Mr Delivery, Bolt Food, and similar operators
- **Restaurant & Hospitality Partners** - Branded storefronts for cafes, fast food, fine dining
- **Enterprise Logistics Operators** - Takealot, DSV, Courier Guy, and national couriers
- **Development Finance Institutions** - sefa, KZN Growth Fund, FNB Business Banking

**Domain:** `lastmilegig.aagais.co.za`

---

## Architecture

```
                         CLIENT LAYER
     Next.js 14  |  Angular 17  |  React Native + Expo
                          |
               AWS API GATEWAY + ISTIO MESH
                          |
     +--------+--------+------+------+--------+--------+
     |        |        |      |      |        |        |
   NestJS  FastAPI    Go    Rust  Spring   Elixir  Solidity
    (TS)  (Python)               Boot    Phoenix
     |        |        |      |      |        |        |
               DATA LAYER
   Supabase | MongoDB | Redis | TimescaleDB | Pinecone | OpenSearch
```

### Backend Languages (6)
- **TypeScript/NestJS** - Core platform services, API gateway
- **Python/FastAPI** - AI inference, LangChain/LangGraph agents, CrewAI
- **Go** - Dispatch engine, route optimization, Kafka consumers
- **Rust** - Blockchain service, IoT telemetry ingestion
- **Java/Spring Boot** - Payment processing, enterprise logistics
- **Elixir/Phoenix** - Real-time tracking, communications hub

### Frontend Frameworks (3)
- **Next.js 14** - Corporate site, restaurant storefronts, customer ordering
- **Angular 17** - Ops dashboards, admin console, command centre
- **React Native/Expo** - Customer mobile app, driver mobile app

---

## 21-Module Ecosystem

| # | Module | Stack | Tier |
|---|---|---|---|
| 01 | Corporate Landing & Investor Relations | Next.js, Sanity, Auth0 | Market Interface |
| 02 | AI Orchestration Platform | Python, LangChain, CrewAI | Intelligence |
| 03 | Driver Rental Module | Angular, NestJS, Paystack | Operations |
| 04 | Contracted Fleet Module | Angular, Go, Polygon CDK | Operations |
| 05 | Branded Fleet Module | Next.js, Java/Spring Boot | Operations |
| 06 | Fleet Servicing Hub | Rust, TimescaleDB, IoT | Operations |
| 07 | Customer Ordering App | React Native, Expo | Market Interface |
| 08 | Blockchain Layer | Rust, Polygon CDK, Hardhat | Trust |
| 09 | Security Layer | Auth0, Vault, WAF | Trust |
| 10 | Enterprise Logistics | Java, Go, Kafka, Flink | Governance |
| 11 | ESG Framework | Angular, CrewAI | Governance |
| 12 | APIs & Integrations Hub | NestJS, AWS API Gateway | Governance |
| 13 | AI & Data Intelligence | Python, SageMaker, Pinecone | Intelligence |
| 14 | Admin & Compliance | Angular, NestJS, Supabase | Governance |
| 15 | Restaurant Storefronts | Next.js, Sanity, Cloudinary | Market Interface |
| 16 | Driver Earnings & Wallet | Angular, Java, Paystack | Operations |
| 17 | Insurance & Risk | NestJS, Go, LangGraph | Operations |
| 18 | Customer Loyalty & Rewards | Next.js, Upstash, LangChain | Market Interface |
| 19 | Command Centre | Angular, Go, Elixir, Grafana | Governance |
| 20 | Developer Portal & Public API | NestJS, OpenAPI | Governance |
| 21 | Communications Hub | Twilio, Firebase, SendGrid | Governance |

---

## Quick Start

### Prerequisites
- Node.js >= 20.x LTS
- Python >= 3.12
- Go >= 1.22
- Rust >= 1.78
- Java >= 21 (OpenJDK)
- Elixir >= 1.16
- Docker >= 25.x

### Setup
```bash
git clone https://github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem.git
cd Lastmile-Gig-Ecosystem
npm install
cp .env.example .env.local
docker compose -f docker-compose.dev.yml up -d
```

---

## Documentation

| Document | Description |
|---|---|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Live project state and progress tracking |
| [DEVELOPMENT_DIRECTIVES.md](./DEVELOPMENT_DIRECTIVES.md) | Binding development rules and constraints |
| [CONTRIBUTIONS.md](./CONTRIBUTIONS.md) | How to contribute, branch strategy, PR process |
| [POLYGLOT_ARCHITECTURE.md](./POLYGLOT_ARCHITECTURE.md) | Language allocation and architecture decisions |
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | Per-language coding conventions |
| [SECURITY.md](./SECURITY.md) | Security policy and vulnerability reporting |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) | 360+ phase development roadmap |
| [docs/specs/](./docs/specs/) | Full 19-document technical specification suite |

---

## Development Metrics

| Metric | Value |
|---|---|
| Total Modules | 21 |
| Estimated Codebase | ~810,000+ LoC |
| Development Phases | 360+ |
| Backend Languages | 6 |
| Cloud Provider | AWS (100%) |
| Primary Region | af-south-1 (Cape Town) |
| Payment Gateways | 7 |
| Blockchain | Polygon CDK (L2) |
| Compliance | POPIA + GDPR |

---

## License

Proprietary - Lastmile Gig (Pty) Ltd, a subsidiary of Affiliated Architecture Group.

All rights reserved. Confidential and proprietary.

---

*Built with precision by the AAG Technology Division*
