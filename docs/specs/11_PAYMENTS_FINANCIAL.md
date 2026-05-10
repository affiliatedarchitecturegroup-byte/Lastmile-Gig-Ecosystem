# PAYMENTS & FINANCIAL INFRASTRUCTURE
**Document:** 11 of 19 | **Version:** 1.0 | **Classification:** Confidential

---

## 1. Payment Gateway Matrix

| Gateway | SDK | Currency | Use Case | Settlement |
|---|---|---|---|---|
| Paystack | `@paystack/paystack-sdk` | ZAR, NGN | Customer charges, driver payouts | T+1 |
| Stripe | `stripe` (Node.js) | Multi-currency | Corporate billing, SaaS | T+2 |
| Flutterwave | `flutterwave-node-v3` | 30+ African | Pan-African expansion | T+1 |
| Peach Payments | REST API | ZAR | High-value enterprise | T+1 |
| Ozow | REST API | ZAR | Instant EFT driver payouts | Real-time |
| SnapScan / MoMo | QR API | ZAR | In-store, walk-in | Instant |
| Polygon CDK | ethers-rs (Rust) | MATIC/stablecoin | Smart contract settlements | Blockchain finality |

## 2. Gateway Selection Logic
```typescript
function selectGateway(context: PaymentContext): Gateway {
  if (context.type === 'driver_instant_payout') return Gateway.OZOW;
  if (context.type === 'corporate_invoice') return Gateway.STRIPE;
  if (context.type === 'sla_settlement') return Gateway.POLYGON_CDK;
  if (context.type === 'enterprise_contract') return Gateway.PEACH;
  if (context.currency !== 'ZAR') return Gateway.FLUTTERWAVE;
  return Gateway.PAYSTACK; // default for ZA customer payments
}
```

## 3. Smart Contract Settlement
Driver payouts above R500 per delivery can be settled via Polygon CDK smart contract — eliminating gateway fees for high-volume partners. The `DriverPayout.sol` contract holds funds in escrow and releases automatically upon blockchain-verified delivery confirmation.

## 4. Reconciliation Engine (Java/Spring Boot)
Daily reconciliation job at 02:00 SAST:
1. Pull all completed payments from Supabase (payments table)
2. Query each gateway API for settled transactions
3. Match by gateway_ref — flag any discrepancies
4. Generate PDF reconciliation report via JasperReports
5. Publish to Finance team via SendGrid + store in S3

## 5. Driver Payout Flow
```
Order delivered → order.delivered Kafka event
→ Payment Service consumes event
→ Calculate driver earnings (base + distance + tip)
→ Deduct platform commission (15%)
→ Check driver payout preference (Ozow EFT vs Polygon CDK)
→ Execute payout via selected channel
→ Update driver wallet balance in Supabase
→ Send payout notification via Elixir Comms service
→ Record to payments table + blockchain (if Polygon route)
```

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
