# API & INTEGRATION SPECIFICATION
**Document:** 12 of 19 | **Version:** 1.0 | **Classification:** Confidential

---

## 1. API Standards

All Lastmile Gig APIs follow:
- **OpenAPI 3.1** — auto-generated from NestJS decorators
- **RESTful** for external-facing resources
- **gRPC** for internal service-to-service (performance-critical paths)
- **GraphQL** for the investor/partner dashboard (flexible data fetching)
- **WebSocket (Phoenix Channels)** for real-time events

Base URL: `https://api.lastmilegig.aagais.co.za/v1`

---

## 2. Third-Party API Integrations

### 2.1 ERP / POS Systems
| System | Integration Type | Module | Data Flow |
|---|---|---|---|
| Pilot POS | REST API webhook | M5, M15 | Orders pushed from Pilot → Lastmile Gig |
| GAAP POS | REST API | M5 | Menu sync, order intake |
| Sage Business Cloud | REST API | M14, M16 | Invoice generation, financial reporting |
| SAP (enterprise) | RFC + REST | M10 | Enterprise logistics, SLA billing |

### 2.2 Fleet & Maintenance
| Provider | API Type | Use Case |
|---|---|---|
| Bosch Service | REST API | Schedule vehicle service appointments |
| Supa Quick | REST API | Tyre replacement, urgent maintenance bookings |
| Custom IoT (MQTT) | MQTT broker | Vehicle telemetry streaming to Rust ingestion service |

### 2.3 Enterprise Logistics
| Provider | API Type | Data |
|---|---|---|
| Takealot Seller API | REST | Parcel creation, tracking, status updates |
| DSV API | SOAP + REST | Shipment booking, collection, tracking |
| Courier Guy API | REST | Waybill creation, pod retrieval |

### 2.4 Identity & Compliance
| Service | SDK/API | Purpose |
|---|---|---|
| AWS Rekognition | Boto3 (Python) | Facial recognition, liveness detection |
| CIPC (manual) | PDF processing + LangChain | Company registration verification |
| SARS eFiling API | REST | VAT number verification |
| Naked Insurance | REST API | Per-delivery micro-insurance |
| Guardrisk | REST API | Commercial fleet insurance |

---

## 3. Webhook Architecture

All third-party payment gateways push events via webhooks to a dedicated webhook receiver endpoint:

```typescript
// POST /v1/webhooks/paystack
// POST /v1/webhooks/stripe
// POST /v1/webhooks/ozow

@Controller('webhooks')
export class WebhookController {
  @Post('paystack')
  async handlePaystack(
    @Headers('x-paystack-signature') sig: string,
    @Body() payload: unknown,
    @RawBody() rawBody: Buffer
  ) {
    // 1. Verify HMAC-SHA512 signature
    const valid = this.webhookService.verifyPaystack(sig, rawBody);
    if (!valid) throw new UnauthorizedException();
    
    // 2. Publish to Kafka for async processing
    await this.kafkaProducer.send({
      topic: 'lmg.payments.webhook',
      messages: [{ value: JSON.stringify({ gateway: 'paystack', payload }) }]
    });
    
    return { received: true };
  }
}
```

---

## 4. Developer Portal API (Module 20)

Public API for third-party developers and restaurant partners:

```yaml
# Public API capabilities
GET    /v1/restaurants              # List active restaurants
GET    /v1/restaurants/{slug}/menu  # Get restaurant menu
POST   /v1/orders                   # Place an order (requires API key)
GET    /v1/orders/{id}              # Track an order
GET    /v1/drivers/available        # Query available drivers in zone
POST   /v1/webhooks/register        # Register a webhook endpoint

# Authentication: Bearer API Key (issued via Developer Portal dashboard)
# Rate Limits: 1000 req/hour (Basic), 10000/hour (Pro), unlimited (Enterprise)
# Sandbox: sandbox.api.lastmilegig.aagais.co.za (test data, no real payments)
```

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
