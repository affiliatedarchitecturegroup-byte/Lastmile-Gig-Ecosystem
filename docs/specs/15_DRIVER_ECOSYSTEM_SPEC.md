# DRIVER ECOSYSTEM SPECIFICATION
**Document:** 15 of 19 | **Version:** 1.0 | **Classification:** Confidential

---

## 1. Driver Journey Overview

```
DISCOVER → APPLY → ONBOARD → ACTIVATE → EARN → GROW → RETAIN
```

Every touchpoint in this journey is a product surface — from the first application form to the 100th delivery milestone badge.

---

## 2. Driver Onboarding Flow

### 2.1 Application (Next.js landing page → NestJS API)
```
Step 1: Personal details (name, ID number, phone, email)
Step 2: Driving licence upload (processed by LangChain document extractor)
Step 3: Vehicle type selection (scooter rental vs own vehicle)
Step 4: Zone preference (KZN-North, KZN-South, Gauteng, etc.)
Step 5: Bank details (Paystack bank verification)
Step 6: POPIA consent (explicit, plain language)
Step 7: Biometric capture (facial photo via device camera)
         → Liveness check (AWS Rekognition)
         → Template stored in HashiCorp Vault
Step 8: Background check consent + submission
```

### 2.2 Biometric Verification (Recurring — each shift start)
```
Driver opens app → taps "Start Shift"
→ Camera opens for selfie capture
→ Liveness detection (AWS Rekognition — prevents photo spoofing)
→ Face comparison against Vault-stored template (>95% similarity required)
→ GPS location captured (shift start geotag)
→ Active shift recorded in Supabase
→ Driver appears in dispatch pool for their zone
```

---

## 3. Driver Performance Scoring

The AI-generated driver performance score (0–100) is calculated weekly by the SageMaker `lmg-driver-scorer-endpoint`:

```python
# Input features
features = {
    'delivery_acceptance_rate': 0.94,    # accepted / offered deliveries
    'on_time_delivery_rate': 0.88,       # delivered within target time
    'customer_rating_avg': 4.7,          # average customer rating (1-5)
    'cancellation_rate': 0.02,           # cancelled after acceptance
    'fraud_flags': 0,                    # fraud detection incidents
    'days_active_last_30': 22,           # active shift days
    'avg_deliveries_per_shift': 8.3,
    'complaint_count_last_30': 0,
}

# Output
{
    'score': 87.4,
    'tier': 'Gold',        # Bronze | Silver | Gold | Elite
    'trend': 'improving',  # improving | stable | declining
    'strengths': ['punctuality', 'customer_service'],
    'improvement_areas': ['acceptance_rate'],
    'recommendations': ['Accept more orders during peak hours for higher earnings']
}
```

**Scoring Tiers:**
| Tier | Score | Benefits |
|---|---|---|
| Bronze | 0–59 | Standard earnings |
| Silver | 60–74 | +5% earnings bonus, priority dispatch |
| Gold | 75–89 | +10% earnings bonus, preferred rental rates |
| Elite | 90–100 | +15% earnings, dedicated support line, first pick of high-value orders |

---

## 4. Driver Wallet & Earnings (Module 16)

```typescript
// Angular dashboard — driver wallet
interface DriverWallet {
  currentBalance: number;        // ZAR
  pendingEarnings: number;       // Delivered but in 10-min hold
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  lifetimeEarnings: number;
  commissionRate: number;        // 15% platform fee
  payoutPreference: 'ozow' | 'polygon';
  nextScheduledPayout: Date;     // or instant via Ozow
}

// Instant payout button → Ozow EFT API
// Tax certificate download → JasperReports (Java) → S3 → download link
```

---

## 5. Insurance (Module 17)

Every active delivery is covered by per-delivery micro-insurance:

```
Driver starts delivery → Insurance Risk Agent (LangGraph) evaluates:
  - Route risk (crime index, road conditions)
  - Driver tier (Gold/Elite = lower premium)
  - Vehicle type and age
  - Time of day
  - Weather

→ Risk score passed to Naked Insurance API
→ Premium deducted from platform (not driver)
→ Cover active from dispatch to delivery confirmation
→ Cover terminates on blockchain delivery verification

Claims:
→ Driver submits claim via app
→ LangGraph claims agent collects evidence (photos, GPS track, delivery record)
→ Submitted to Naked/Guardrisk via API
→ Claim status tracked in driver wallet dashboard
```

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
