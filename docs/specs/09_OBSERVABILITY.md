# OBSERVABILITY SPECIFICATION
**Document:** 09 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Observability Philosophy — Global Top 1%

Full-stack observability across all three pillars — **metrics, logs, and traces** — with unified correlation, real-time alerting, and chaos engineering built in from Phase 1.

```
PILLAR         TOOLS
───────────────────────────────────────────────
Metrics        Prometheus → Grafana
Logs           All services → Loki → Grafana
Traces         OpenTelemetry → Tempo + Jaeger → Grafana
Errors         Sentry (frontend + backend)
APM            Datadog (application + infrastructure)
Alerting       PagerDuty (on-call routing + escalation)
Chaos          AWS Fault Injection Simulator
Uptime         AWS CloudWatch Synthetics
```

---

## 2. OpenTelemetry — Unified Instrumentation

Every service — regardless of language — emits OTel signals using the OpenTelemetry SDK.

```yaml
# otel-collector-config.yaml (deployed as DaemonSet on EKS)
receivers:
  otlp:
    protocols:
      grpc: { endpoint: "0.0.0.0:4317" }
      http: { endpoint: "0.0.0.0:4318" }

processors:
  batch:
    timeout: 10s
    send_batch_size: 1000
  resource:
    attributes:
      - key: deployment.environment
        value: "${ENVIRONMENT}"
        action: upsert
      - key: service.namespace
        value: "lastmile-gig"
        action: upsert

exporters:
  prometheus:        { endpoint: "0.0.0.0:8889" }
  loki:              { endpoint: "http://loki.lmg-monitoring:3100" }
  otlp/tempo:        { endpoint: "http://tempo.lmg-monitoring:4317" }
  otlp/jaeger:       { endpoint: "http://jaeger.lmg-monitoring:4317" }
  datadog:           { api: { key: "${DATADOG_API_KEY}" } }

service:
  pipelines:
    traces:   { receivers: [otlp], processors: [batch, resource], exporters: [otlp/tempo, otlp/jaeger, datadog] }
    metrics:  { receivers: [otlp], processors: [batch, resource], exporters: [prometheus, datadog] }
    logs:     { receivers: [otlp], processors: [batch, resource], exporters: [loki] }
```

**Per-language instrumentation:**
```typescript
// TypeScript/NestJS
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
const sdk = new NodeSDK({ instrumentations: [getNodeAutoInstrumentations()] });
sdk.start();
```
```python
# Python/FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
FastAPIInstrumentor.instrument_app(app)
```
```go
// Go
import "go.opentelemetry.io/otel"
tracer := otel.Tracer("lmg.dispatch-engine")
ctx, span := tracer.Start(ctx, "dispatch.match_driver")
defer span.End()
```

---

## 3. Prometheus + Grafana — Metrics

### 3.1 Key Metrics per Service
```yaml
# Business metrics (custom)
lmg_orders_total{status, zone, partner}          # order throughput
lmg_dispatch_duration_seconds{zone}              # dispatch decision latency
lmg_active_drivers{zone, vehicle_type}           # live driver count
lmg_delivery_time_seconds{zone, partner}         # actual vs target delivery time
lmg_payment_amount_zar_total{gateway}            # revenue by gateway
lmg_sla_breach_total{partner_id}                # SLA breach count
lmg_carbon_kg_total{zone, vehicle_type}          # carbon tracking

# Infrastructure metrics (auto via OTel)
http_request_duration_seconds                   # p50, p95, p99 latency
http_requests_total{status_code, route}         # request throughput + error rate
process_cpu_seconds_total                       # CPU utilisation
process_resident_memory_bytes                   # memory
kafka_consumer_lag{topic, consumer_group}       # Kafka consumer lag
```

### 3.2 Core Grafana Dashboards
| Dashboard | Panels | Audience |
|---|---|---|
| Platform Overview | Active orders, drivers, revenue/hr, error rate | All ops staff |
| Dispatch Intelligence | Dispatch latency, AI confidence scores, HITL rate | Ops + AI team |
| Driver Health | Active drivers by zone, performance scores, incidents | Fleet managers |
| Fleet Telemetry | Vehicle health, battery %, maintenance alerts | Fleet managers |
| Payment Gateway | Transaction volume, failure rate per gateway | Finance |
| ESG Dashboard | Carbon kg/day, EV %, solar contribution | ESG officer |
| SLA Compliance | SLA adherence per partner, breach trends | Account managers |
| Infrastructure | EKS node utilisation, pod health, Kafka lag | DevOps |

---

## 4. Loki — Log Aggregation

```yaml
# Log labels (structured, indexed)
{
  service: "api-gateway",
  namespace: "lmg-core",
  environment: "production",
  level: "error" | "warn" | "info",
  trace_id: "abc123"     # correlates logs to traces
}

# LogQL query examples
# All errors in last 1h with trace correlation
{service="api-gateway", level="error"} | json | line_format "{{.trace_id}} {{.message}}"

# Kafka consumer lag alerts
{service="dispatch-engine"} | json | kafka_consumer_lag > 1000
```

**Log Retention:** 30 days hot (Loki), 1 year cold (S3 archive)

---

## 5. Tempo + Jaeger — Distributed Tracing

Every request across all microservices is traced end-to-end with span correlation via `trace_id` propagated through W3C TraceContext headers.

```
Customer places order → API Gateway (NestJS) 
  → Order Service (NestJS) 
    → Dispatch Engine (Go) 
      → AI Inference (Python) [route optimise]
      → Tracking Service (Elixir) [broadcast location]
    → Payment Service (Java) [payment initiation]
    → Blockchain Service (Rust) [delivery record]
    → Comms Service (Elixir) [send notifications]
```

All spans visible in single Tempo/Jaeger trace — total e2e latency, bottleneck identification, error propagation.

---

## 6. Sentry — Error Tracking

```typescript
// Frontend (Next.js)
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% trace sampling in production
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0  // 100% replay on errors
});
```

---

## 7. PagerDuty — Incident Management

```yaml
# Alert Routing
SEVERITY    RESPONSE TIME    ROUTE
─────────────────────────────────────────────────────
P1 (Critical) 5 min          Phone call → Primary on-call → Escalation chain
P2 (High)     15 min         SMS + Slack → On-call engineer
P3 (Medium)   1 hour         Slack #incidents channel
P4 (Low)      Next business  Jira ticket auto-created

# P1 Examples (auto-triggered from Grafana/CloudWatch)
- Payment service error rate > 1% for 2 min
- API Gateway p99 latency > 5s for 5 min
- Kafka consumer lag > 50,000 messages
- EKS node count drops below minimum
- Dispatch engine down (no dispatch decisions in 60s)
```

---

## 8. Chaos Engineering — AWS Fault Injection Simulator

```json
// Monthly chaos experiments
{
  "experiments": [
    {
      "name": "Kill 1 of 3 API Gateway pods",
      "target": "eks-pod:api-gateway",
      "action": "terminate",
      "percentage": 33,
      "duration": "5 minutes",
      "acceptance_criteria": "P99 latency stays < 2s, zero 5xx to end users"
    },
    {
      "name": "Introduce 500ms latency to Payment Service",
      "target": "eks-pod:payment-service",
      "action": "network-latency",
      "latency_ms": 500,
      "duration": "10 minutes"
    },
    {
      "name": "Terminate 1 Kafka broker",
      "target": "msk-broker",
      "action": "terminate",
      "duration": "15 minutes",
      "acceptance_criteria": "No message loss, consumer lag recovers within 5 min"
    }
  ]
}
```

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
