# DEVELOPMENT DIRECTIVES

**Project:** Lastmile Gig Ecosystem  
**Classification:** Binding Development Standard  
**Effective Date:** 2026-05-10  

---

## 1. Source File Constraints

### 1.1 Lines of Code (LoC) Policy

| Constraint | Value | Enforcement |
|---|---|---|
| **Standard Range** | 300-800 LoC | Target for all source files |
| **Acceptable Range** | 800-1,200 LoC | Permitted with justification comment at file header |
| **Extended Range** | 1,200-1,800 LoC | Requires team lead approval, must include TODO for refactor |
| **Hard Cap** | 1,800 LoC | Absolute maximum. No source file may exceed this limit. |
| **Minimum Meaningful** | 50 LoC | Files below 50 LoC should be merged or consolidated |

**Enforcement mechanism:** Pre-commit hook + CI check rejects files exceeding 1,800 LoC.

### 1.2 File Organization Rules
- One class/component per file (single responsibility)
- Index/barrel files for clean exports
- Test files colocated with source (`*.spec.ts`, `*_test.go`, `*_test.rs`)
- Constants and types in dedicated files, not inline

---

## 2. Wave & Session Structure

### 2.1 Session Definition
A **session** is a single development execution block consisting of at least 5 waves. Each session targets a coherent set of functionality within a phase group.

### 2.2 Wave Definition
A **wave** is an atomic unit of work within a session:
- Minimum **7 tasks or dedicated source files** per wave
- Each wave produces a **Git branch** and a **pull request**
- Each wave is **independently testable** and **independently deployable**
- Wave branches follow naming: `wave/{phase}-{session}-{wave-number}/{description}`

### 2.3 Wave Completion Checklist
Before a wave is marked complete:
- [ ] All source files created/modified
- [ ] All tests written and passing
- [ ] Linting passes (zero errors)
- [ ] LoC counted and recorded in PROJECT_STATUS.md
- [ ] Branch pushed to remote
- [ ] Pull request created with proper template
- [ ] PR merged to main

### 2.4 Session Completion Checklist
Before a session is marked complete:
- [ ] All 5+ waves completed and merged
- [ ] Cumulative LoC calculated and recorded
- [ ] PROJECT_STATUS.md updated with session summary
- [ ] No open TODO items from this session (or tracked as future phases)

---

## 3. Polyglot Language Discipline

### 3.1 Language-to-Domain Mapping (Immutable)

| Domain | Language | Framework | Rationale |
|---|---|---|---|
| API Gateway & Core Services | TypeScript | NestJS | Type safety, DI, GraphQL support |
| AI/ML & Agentic Workflows | Python | FastAPI | AI ecosystem dominance |
| High-Throughput Dispatch | Go | Gin | Goroutine concurrency, low latency |
| Cryptographic & IoT | Rust | Axum | Memory safety, zero-cost abstractions |
| Enterprise & Payments | Java | Spring Boot | Enterprise integration ecosystem |
| Real-Time WebSocket | Elixir | Phoenix | BEAM VM, millions of processes |
| Smart Contracts | Solidity | Hardhat | EVM compatibility |
| Frontend (Market) | TypeScript | Next.js 14 | SSR/SSG, SEO |
| Frontend (Ops) | TypeScript | Angular 17 | Complex state, reactive streams |
| Frontend (Mobile) | TypeScript | React Native/Expo | Cross-platform mobile |
| Infrastructure | HCL | Terraform | IaC standard |

### 3.2 Language Selection Violations
No developer or agent may:
- Rewrite a Go service in Python "for convenience"
- Use JavaScript instead of TypeScript anywhere in the stack
- Introduce a language not listed in the tech stack without an ADR
- Use `any` types in TypeScript (strict mode enforced)

---

## 4. Code Quality Standards

### 4.1 Testing Requirements

| Service Type | Unit Coverage | Integration | E2E |
|---|---|---|---|
| Core Services (NestJS) | >= 80% | Required | - |
| Payment Services (Java) | >= 85% | Required | Required |
| Blockchain Services (Rust) | >= 90% | Required | - |
| AI Services (Python) | >= 80% | Required | - |
| Dispatch Engine (Go) | >= 80% | Required | - |
| Frontend (Next.js) | >= 75% | - | Playwright |
| Frontend (Angular) | >= 80% | - | Cypress |
| Mobile (React Native) | >= 75% | - | Detox |
| Smart Contracts | >= 95% | Required | - |

### 4.2 Commit Message Standard
All commits follow Conventional Commits:
```
<type>(<scope>): <description>

Types: feat, fix, docs, test, chore, refactor, perf, security, ci
Scope: service name or module (e.g., dispatch, payments, auth)
```

### 4.3 Import Order (All Languages)
1. Standard library imports
2. Third-party package imports
3. Internal/project imports
4. Relative imports
5. Type-only imports (TypeScript)

---

## 5. Security Directives (Non-Negotiable)

### 5.1 Authentication
- Every endpoint requires JWT or API key authentication unless explicitly public
- Auth0 for user-facing auth, AWS Cognito for M2M and drivers
- MFA enforced for admin and ops roles

### 5.2 Data Protection
- No PII in logs (names, emails, phones, biometrics)
- No secrets in code or committed .env files
- Secrets via HashiCorp Vault or AWS Secrets Manager only
- RLS enabled on all Supabase tables
- AES-256 encryption at rest, TLS 1.3 in transit

### 5.3 POPIA Compliance
- Explicit consent required before collecting any personal data
- Right to erasure endpoints required for all user data
- Biometric data stored only in Vault, never in application databases
- All data processing logged to audit_log table

---

## 6. API Standards

### 6.1 REST API Rules
- OpenAPI 3.1 specification (auto-generated from decorators)
- JSON:API response format for collection resources
- RFC 7807 Problem Details for error responses
- ISO 8601 for all timestamps
- UUID v4 for all entity identifiers
- Semantic versioning for API versions (`/v1/`, `/v2/`)
- Rate limiting headers on all responses

### 6.2 Endpoint Naming
```
GET    /v1/{resource}              List
GET    /v1/{resource}/:id          Get one
POST   /v1/{resource}              Create
PATCH  /v1/{resource}/:id          Update
DELETE /v1/{resource}/:id          Soft delete
```

---

## 7. Infrastructure Directives

### 7.1 Terraform Only
All AWS resources provisioned via Terraform. No manual AWS console changes. No AWS CLI create/delete commands outside Terraform.

### 7.2 GitOps Only
All deployments via ArgoCD from Git state. No manual kubectl apply in production. No SSH into production nodes.

### 7.3 Environment Promotion
```
feature-branch -> dev (auto) -> staging (PR merge) -> production (manual gate)
```

---

## 8. Observability Requirements

Every new service, route handler, Kafka consumer, and background job must emit:
- OpenTelemetry trace span with relevant attributes
- Prometheus metrics (request count, duration, error rate)
- Structured log entry with `trace_id` correlation
- Sentry error capture with full context

---

## 9. Database Change Protocol

1. Write a versioned migration file
2. Ensure backward compatibility (no dropping columns without deprecation)
3. Add RLS policies for any new table
4. Update `07_DATABASE_ARCHITECTURE.md` schema section
5. Migration runs as init container before new pods start

---

## 10. Environment Variable Naming

All platform environment variables use the `LMG_` prefix:
```
LMG_SUPABASE_URL
LMG_SUPABASE_ANON_KEY
LMG_MONGODB_URI
LMG_UPSTASH_REDIS_URL
LMG_AUTH0_DOMAIN
LMG_PAYSTACK_SECRET_KEY
LMG_AWS_REGION=af-south-1
```

---

*These directives are binding for all human developers and AI coding agents operating in this codebase.*
