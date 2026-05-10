# SECURITY POLICY

**Project:** Lastmile Gig Ecosystem  
**Classification:** Security-Critical  

---

## 1. Reporting Vulnerabilities

If you discover a security vulnerability in this project:

1. **DO NOT** create a public GitHub issue
2. Email security@aagais.co.za with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if available)
3. You will receive acknowledgement within 24 hours
4. Resolution timeline: Critical (24h), High (72h), Medium (7 days), Low (30 days)

---

## 2. Security Architecture Summary

### 2.1 Defence-in-Depth Layers
```
Layer 6 - COMPLIANCE:      POPIA + GDPR audit, DFI reporting
Layer 5 - SUPPLY CHAIN:    Snyk, SonarQube, Checkov, SBOM
Layer 4 - APPLICATION:     OWASP ZAP, input validation, rate limiting
Layer 3 - DATA:            AES-256, TLS 1.3, Vault, biometric controls
Layer 2 - IDENTITY:        Auth0, AWS Cognito, RBAC, biometric auth
Layer 1 - NETWORK:         AWS WAF, Shield Advanced, Istio mTLS, VPC
```

### 2.2 Authentication Providers
- **Auth0:** Customer, partner, admin, investor authentication
- **AWS Cognito:** Driver mobile app, M2M service auth
- **Biometric:** AWS Rekognition facial verification (drivers)

### 2.3 Encryption
- **At Rest:** AES-256 on all data stores (AWS KMS managed)
- **In Transit:** TLS 1.3 on all external endpoints, Istio mTLS internal
- **Biometric:** AES-256-GCM via Vault Transit engine

---

## 3. RBAC Role Hierarchy

```
SUPER_ADMIN   Full platform + infrastructure access (MFA + IP allowlist)
ADMIN         Full platform access (MFA required)
OPS_SENIOR    All ops + HITL approval gates
OPS_STAFF     View all orders, manage dispatch
FLEET_MANAGER Fleet assignment, maintenance
FINANCE       Payment records, invoices, reconciliation
ESG_OFFICER   ESG dashboard, report generation
PARTNER_ADMIN Partner staff + analytics, settings
PARTNER_STAFF Manage menu, view orders
INVESTOR      Investor dashboard (read-only)
DEVELOPER     Developer Portal API access
DRIVER        Accept orders, view earnings, manage rental
CUSTOMER      Place orders, view own history
```

---

## 4. Dependency Management

- All dependencies scanned by Snyk on every PR
- HIGH/CRITICAL vulnerabilities block merge
- Automated dependency updates via Dependabot
- SBOM (Software Bill of Materials) generated on every release

---

## 5. Secrets Management

| Secret Type | Storage | Rotation |
|---|---|---|
| Database credentials | Vault (dynamic, short-lived) | Per-request |
| API keys (third-party) | Vault kv-v2 | 90 days |
| JWT signing keys | Auth0 managed | Annual |
| AWS credentials | Vault AWS engine | Per-request |
| Blockchain wallet keys | Vault transit engine | Never (immutable) |
| TLS certificates | Vault PKI engine | 90 days |

---

## 6. POPIA Compliance Controls

| Requirement | Implementation |
|---|---|
| Lawful processing | Explicit consent UI + audit trail |
| Purpose specification | Privacy policy per data type |
| Data minimisation | Collect only required fields |
| Security safeguards | Full encryption stack |
| Right to erasure | DELETE /v1/users/me/data-deletion |
| Cross-border restrictions | Primary data in af-south-1 only |
| Biometric special category | Vault-only storage, explicit consent |

---

## 7. Penetration Testing

| Test | Frequency | Scope |
|---|---|---|
| External pentest | Annual + pre-launch | All public endpoints |
| OWASP ZAP DAST | Every staging deploy | All web surfaces |
| Snyk dependency scan | Every commit | All dependencies |
| SonarQube SAST | Every PR | All source code |
| Checkov IaC scan | Every Terraform change | All infrastructure |
| Bug bounty | Continuous (post-launch) | HackerOne program |

---

*For full security specification, see docs/specs/10_SECURITY_COMPLIANCE.md*
