# DEVOPS & CI/CD SPECIFICATION
**Document:** 13 of 19 | **Version:** 1.0 | **Classification:** Confidential

---

## 1. GitOps Model

All infrastructure and application state is declared in Git. No manual deployments. No SSH into production.

```
Developer pushes code → GitHub PR created
→ GitHub Actions CI runs (build + test + lint + security scan)
→ PR review required (minimum 1 approver)
→ Merge to main → ArgoCD detects change → deploys to staging
→ Staging smoke tests pass → Manual approval gate
→ ArgoCD deploys to production
```

---

## 2. Repository Structure (Monorepo — Nx)

```
lastmile-gig/
├── apps/
│   ├── web-corporate/         # Next.js 14 — corporate site
│   ├── web-storefronts/       # Next.js 14 — restaurant storefronts
│   ├── web-customer/          # Next.js 14 — customer ordering
│   ├── web-loyalty/           # Next.js 14 — loyalty module
│   ├── dashboard-ops/         # Angular 17 — ops dashboards
│   ├── dashboard-admin/       # Angular 17 — admin console
│   ├── dashboard-command/     # Angular 17 — command centre
│   ├── mobile-customer/       # React Native — customer app
│   ├── mobile-driver/         # React Native — driver app
│   ├── api-gateway/           # NestJS — API gateway
│   ├── svc-auth/              # NestJS — auth service
│   ├── svc-orders/            # NestJS — order service
│   ├── svc-drivers/           # NestJS — driver service
│   ├── svc-fleet/             # NestJS — fleet management
│   ├── svc-storefronts/       # NestJS — storefront service
│   ├── svc-payments/          # Java/Spring Boot — payment service
│   ├── svc-logistics/         # Java/Spring Boot — enterprise logistics
│   ├── svc-dispatch/          # Go — dispatch engine
│   ├── svc-tracking/          # Elixir — real-time tracking
│   ├── svc-comms/             # Elixir — communications hub
│   ├── svc-ai/                # Python — AI inference
│   ├── svc-agents/            # Python — LangChain/LangGraph/CrewAI
│   ├── svc-iot/               # Rust — IoT telemetry ingestion
│   ├── svc-blockchain/        # Rust — blockchain service
│   └── svc-analytics/         # Python — analytics service
├── libs/
│   ├── shared-types/          # TypeScript types shared across apps
│   ├── shared-ui/             # shadcn/ui components
│   ├── shared-utils/          # Shared utilities
│   └── api-client/            # Generated API client (OpenAPI)
├── contracts/
│   └── solidity/              # Hardhat smart contracts
├── infrastructure/
│   ├── terraform/             # All IaC
│   └── helm/                  # All Helm charts
├── .github/
│   └── workflows/             # GitHub Actions CI/CD pipelines
└── docs/                      # 19 Markdown documents (this suite)
```

---

## 3. GitHub Actions — CI Pipeline

```yaml
# .github/workflows/ci.yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.changes.outputs.services }}
    steps:
      - uses: actions/checkout@v4
      - id: changes
        uses: dorny/paths-filter@v3
        with:
          filters: |
            api-gateway:    ['apps/api-gateway/**']
            svc-dispatch:   ['apps/svc-dispatch/**']
            svc-payments:   ['apps/svc-payments/**']
            web-corporate:  ['apps/web-corporate/**']

  build-and-test:
    needs: detect-changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJson(needs.detect-changes.outputs.services) }}
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t lmg/${{ matrix.service }}:${{ github.sha }} apps/${{ matrix.service }}

      - name: Run unit tests
        run: docker run lmg/${{ matrix.service }}:${{ github.sha }} test

      - name: Snyk security scan
        uses: snyk/actions/docker@master
        with:
          image: lmg/${{ matrix.service }}:${{ github.sha }}
          args: --severity-threshold=high

      - name: SonarQube analysis
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push lmg/${{ matrix.service }}:${{ github.sha }}

  terraform-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Checkov IaC scan
        uses: bridgecrewio/checkov-action@master
        with:
          directory: infrastructure/terraform
          framework: terraform
          soft_fail: false  # fails CI on HIGH/CRITICAL findings

  smart-contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Hardhat tests
        run: |
          cd contracts/solidity
          npm ci && npx hardhat test
      - name: Slither static analysis
        run: |
          pip install slither-analyzer
          slither contracts/solidity/contracts/ --exclude-dependencies
```

---

## 4. ArgoCD — GitOps Continuous Delivery

```yaml
# argocd/applications/api-gateway.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-gateway
  namespace: argocd
spec:
  project: lastmile-gig
  source:
    repoURL: https://github.com/aag-group/lastmile-gig
    targetRevision: HEAD
    path: infrastructure/helm/api-gateway
    helm:
      valueFiles:
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: lmg-core
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

---

## 5. Coolify — Staging & Preview Deployments

```yaml
# Coolify handles:
# 1. Feature branch preview deployments (auto-created on PR)
# 2. Staging environment (full stack, scaled-down)
# 3. Internal tool hosting (SonarQube, pgAdmin, Grafana staging)

# Preview URL pattern:
# pr-{number}.preview.lastmilegig.aagais.co.za

# Auto-cleanup: preview environments destroyed on PR close/merge
```

---

## 6. Deployment Strategy

| Service Type | Strategy | Reason |
|---|---|---|
| Stateless services (NestJS, Go, Python) | Rolling update (25% max surge) | Zero-downtime |
| Stateful services (Elixir) | Blue/Green | Preserve WebSocket connections |
| Database migrations | Pre-deployment job (init container) | Run before new pods start |
| Smart contracts | Manual deployment with multi-sig | Immutable — irreversible |
| Frontend (Next.js) | Vercel-style atomic deployment + CDN invalidation | Instant rollback |

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
