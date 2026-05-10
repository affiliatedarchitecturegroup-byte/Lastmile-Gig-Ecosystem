# SECURITY & COMPLIANCE SPECIFICATION
**Document:** 10 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Security Architecture Overview

Security is defence-in-depth across six layers: network, identity, data, application, supply chain, and compliance.

```
LAYER 6 — COMPLIANCE          POPIA + GDPR audit, DFI reporting
LAYER 5 — SUPPLY CHAIN        Snyk, SonarQube, Checkov, SBOM
LAYER 4 — APPLICATION         OWASP ZAP, input validation, rate limiting
LAYER 3 — DATA                AES-256, TLS 1.3, Vault, biometric controls
LAYER 2 — IDENTITY            Auth0, AWS Cognito, RBAC, biometric auth
LAYER 1 — NETWORK             AWS WAF, Shield Advanced, Istio mTLS, VPC
```

---

## 2. Identity & Authentication

### 2.1 Auth0 (Primary Identity Provider)
```
Use Cases:
- Customer web/mobile login (social + email/password)
- Partner portal login (SSO via SAML 2.0 for corporate partners)
- Investor dashboard access (MFA enforced)
- Admin and ops staff login (MFA enforced, IP allowlist)

Configuration:
- Universal Login (Auth0 hosted, POPIA-compliant)
- Refresh token rotation enabled
- Absolute session timeout: 8 hours (ops), 30 days (customers with "remember me")
- Brute force protection: 10 failed attempts → 24h lockout
- Anomalous login detection: Auth0 Attack Protection enabled
```

### 2.2 AWS Cognito (API & Mobile Auth)
```
Use Cases:
- Driver mobile app authentication (React Native)
- Machine-to-machine (M2M) auth for internal services
- API key management for Developer Portal (Module 20)

User Pools:
- lmg-drivers-pool     → Driver mobile app users
- lmg-m2m-pool         → Service-to-service OAuth2 clients
```

### 2.3 RBAC Role Definitions
```typescript
enum UserRole {
  CUSTOMER        = 'customer',       // place orders, view own history
  DRIVER          = 'driver',         // accept orders, view earnings, manage rental
  PARTNER_STAFF   = 'partner_staff',  // manage menu, view orders
  PARTNER_ADMIN   = 'partner_admin',  // all partner_staff + analytics, settings
  OPS_STAFF       = 'ops_staff',      // view all orders, manage dispatch (read-heavy)
  OPS_SENIOR      = 'ops_senior',     // all ops_staff + HITL approval gates
  FLEET_MANAGER   = 'fleet_manager',  // fleet assignment, maintenance
  FINANCE         = 'finance',        // payment records, invoices, reconciliation
  ESG_OFFICER     = 'esg_officer',    // ESG dashboard, report generation
  ADMIN           = 'admin',          // full platform access
  SUPER_ADMIN     = 'super_admin',    // infrastructure + user management (MFA + IP allowlist)
  INVESTOR        = 'investor',       // investor dashboard read-only
  DEVELOPER       = 'developer',      // Developer Portal API access
}
```

---

## 3. Biometric Data — POPIA Compliance

Biometric data is a **special category** under POPIA Section 26. Strict controls apply:

```
BIOMETRIC CONTROL               IMPLEMENTATION
──────────────────────────────────────────────────────────────────────
Explicit consent required       Consent UI with plain-language explanation
                                before biometric capture; stored in audit_log
Purpose limitation              Biometrics used only for driver identity
                                verification — not for marketing or profiling
Data minimisation               Only biometric template hash stored, never raw image
Separate storage                Biometric templates stored in dedicated Vault secret
                                engine — separate from all other data stores
Access control                  Only auth-service and biometric-verification-service
                                can read biometric vault; audit logged
Retention                       Deleted immediately on driver account closure
Right to erasure                Erasure endpoint triggers Vault secret deletion
                                within 24 hours — verifiable via audit log
Cross-border restriction        Biometric templates never leave af-south-1 region
```

### 3.1 AWS Rekognition Integration (Facial Recognition)
```python
# Driver identity verification flow
async def verify_driver_identity(
    selfie_image: bytes,
    driver_id: str
) -> VerificationResult:
    
    # 1. Liveness check first (prevents photo spoofing)
    liveness = await rekognition.detect_face_liveness(image=selfie_image)
    if liveness.confidence < 0.95:
        raise LivenessCheckFailed()
    
    # 2. Retrieve stored face template from Vault (never from DB)
    stored_template = await vault.get_secret(f"biometric/{driver_id}/face-template")
    
    # 3. Compare faces — Rekognition similarity check
    comparison = await rekognition.compare_faces(
        source_image=selfie_image,
        target_image=stored_template,
        similarity_threshold=95.0  # 95% minimum similarity
    )
    
    # 4. Log verification event (no biometric data in log — only result + timestamp)
    await audit_log.record(
        actor_id=driver_id,
        action="biometric_verification",
        result=comparison.matched,
        similarity=comparison.similarity
    )
    
    return VerificationResult(matched=comparison.matched, confidence=comparison.similarity)
```

---

## 4. Data Encryption

### 4.1 At Rest
| Data Store | Encryption | Key Management |
|---|---|---|
| Supabase PostgreSQL | AES-256 (AWS KMS managed) | AWS KMS with automatic annual rotation |
| MongoDB Atlas | AES-256 (Atlas managed) | Atlas KMS + customer-managed keys |
| Upstash Redis | AES-256 (Upstash managed) | Upstash KMS |
| S3 (all buckets) | SSE-S3 / SSE-KMS | AWS KMS per-bucket key |
| EBS volumes (EC2) | AES-256 (AWS managed) | AWS KMS |
| Biometric templates | AES-256-GCM | HashiCorp Vault Transit engine |

### 4.2 In Transit
- TLS 1.3 minimum enforced on all external endpoints (AWS ALB policy: ELBSecurityPolicy-TLS13-1-2-2021-06)
- Istio mTLS STRICT mode between all Kubernetes services
- Kafka TLS encryption between producers, brokers, and consumers
- Database connections: TLS enforced (Supabase + MongoDB Atlas + Upstash)

---

## 5. HashiCorp Vault

```
Deployment:     Self-hosted on EKS (lmg-vault namespace)
Storage:        AWS DynamoDB (HA backend)
Auto-Unseal:    AWS KMS
HA:             3-node Raft cluster

Secret Engines:
- kv-v2           → Application secrets (DB credentials, API keys)
- transit         → Biometric template encryption/decryption
- pki             → Internal TLS certificate authority
- aws             → Dynamic AWS credentials for services
- database        → Dynamic PostgreSQL credentials (short-lived, auto-rotated)

Auth Methods:
- kubernetes      → Pod identity via Kubernetes service account
- approle         → CI/CD pipelines (GitHub Actions)
- ldap            → Human admin access (ops team)

Policies enforce least-privilege — each service can only read its own secrets.
```

---

## 6. AWS WAF Rules

```hcl
# WAF Rule Group — Applied to all ALBs
resource "aws_wafv2_web_acl" "lmg_waf" {
  name  = "lmg-production-waf"
  scope = "REGIONAL"

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    # Blocks OWASP Top 10 — SQLi, XSS, command injection
    override_action { none {} }
    statement { managed_rule_group_statement {
      name        = "AWSManagedRulesCommonRuleSet"
      vendor_name = "AWS"
    }}
  }

  rule {
    name     = "RateLimitGeneral"
    priority = 2
    action { block {} }
    statement { rate_based_statement {
      limit              = 2000   # 2000 req/5min per IP
      aggregate_key_type = "IP"
    }}
  }

  rule {
    name     = "RateLimitPaymentEndpoints"
    priority = 3
    action { block {} }
    statement { rate_based_statement {
      limit              = 100    # 100 req/5min per IP to /payments/*
      aggregate_key_type = "IP"
      scope_down_statement {
        byte_match_statement {
          field_to_match { uri_path {} }
          positional_constraint = "STARTS_WITH"
          search_string         = "/payments"
        }
      }
    }}
  }

  rule {
    name     = "AWSShieldAdvancedDDoS"
    priority = 0
    # Shield Advanced handles at network layer before WAF
  }
}
```

---

## 7. Application Security

### 7.1 Input Validation
```typescript
// All NestJS endpoints use class-validator + class-transformer
import { IsUUID, IsEmail, IsEnum, Length, IsLatitude, IsLongitude } from 'class-validator';

export class PlaceOrderDto {
  @IsUUID() partnerId: string;
  @IsArray() @ValidateNested({ each: true }) items: OrderItemDto[];
  @IsObject() @ValidateNested() deliveryAddress: DeliveryAddressDto;
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
}
```

### 7.2 Security Headers (Next.js)
```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' https://cdn.auth0.com; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' https://*.supabase.co wss://*.lastmilegig.aagais.co.za" },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];
```

---

## 8. POPIA Compliance Framework

```
POPIA REQUIREMENT                    IMPLEMENTATION
────────────────────────────────────────────────────────────────────
Lawful processing (s9)               Explicit consent UI + legitimate interest documented
Purpose specification (s13)          Privacy policy specifies exact purposes per data type
Further processing limitation (s15)  Data not used beyond stated purpose — enforced in code
Information quality (s16)            Data validation at input; duplicate detection
Openness (s17)                       Privacy policy public; data inventory maintained
Security safeguards (s19)            Full encryption stack (see Section 4)
Data subject participation (s23)     Self-service: access, correction, deletion endpoints
Right to erasure                     /api/v1/users/me/data-deletion — 30-day processing SLA
Responsible party (s55)              Data Protection Officer (DPO) designated from ops team
PAIA manual                          Public document outlining data access procedures
Data breach notification             PagerDuty P1 → DPO → ICO notification within 72h
```

---

## 9. Penetration Testing Schedule

| Test Type | Frequency | Provider |
|---|---|---|
| External penetration test | Annual (pre-launch + annually) | Certified third party |
| OWASP ZAP automated DAST | Every CI/CD deployment to staging | GitHub Actions |
| Snyk dependency scan | Every commit | GitHub Actions |
| SonarQube SAST | Every PR | GitHub Actions |
| Checkov IaC scan | Every Terraform plan | GitHub Actions |
| AWS Inspector | Continuous | AWS (automated) |
| Bug bounty programme | Continuous (post-launch) | HackerOne |

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
