## Description

<!-- Describe the changes in this PR. What does it do and why? -->

**Phase:** P___  
**Wave:** Phase __ / Session __ / Wave __  
**Module(s) Affected:** <!-- M01, M02, etc. -->

---

## Changes Made

<!-- List the key changes -->
- 
- 
- 

---

## Type of Change

- [ ] `feat` - New feature
- [ ] `fix` - Bug fix
- [ ] `docs` - Documentation only
- [ ] `test` - Adding/updating tests
- [ ] `refactor` - Code restructuring (no behavior change)
- [ ] `perf` - Performance improvement
- [ ] `security` - Security fix/improvement
- [ ] `chore` - Maintenance task
- [ ] `ci` - CI/CD pipeline change
- [ ] `infra` - Infrastructure change (Terraform/Helm)

---

## LoC Metrics

| Metric | Value |
|---|---|
| **Files Created** | |
| **Files Modified** | |
| **LoC Added (this wave)** | |
| **Cumulative Session LoC** | |
| **Largest File (LoC)** | |

---

## Checklist

### Code Quality
- [ ] Code follows DEVELOPMENT_DIRECTIVES.md standards
- [ ] Correct language used for domain (per POLYGLOT_ARCHITECTURE.md)
- [ ] No `any` types in TypeScript (`strict: true` enforced)
- [ ] No files exceed 1,800 LoC hard cap
- [ ] Import order follows project standard
- [ ] Conventional commit messages used

### Security
- [ ] No PII logged (names, emails, phones, biometrics)
- [ ] No secrets committed (API keys, passwords, tokens)
- [ ] JWT/API key authentication on all protected endpoints
- [ ] Input validation present (class-validator or equivalent)
- [ ] RLS policies added for any new Supabase tables
- [ ] POPIA consent checks where personal data is collected

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written where applicable
- [ ] Test coverage meets service threshold (80%+ default)
- [ ] E2E tests for user-facing flows (if applicable)

### Observability
- [ ] OpenTelemetry trace spans added
- [ ] Prometheus metrics emitted
- [ ] Structured logging with trace_id correlation
- [ ] Sentry error capture configured

### Documentation
- [ ] API changes reflected in OpenAPI spec
- [ ] Database migrations included (if schema changed)
- [ ] ADR created for architectural decisions
- [ ] PROJECT_STATUS.md updated with wave completion data

### Infrastructure (if applicable)
- [ ] Terraform plan reviewed and passes Checkov
- [ ] Helm chart values documented
- [ ] ArgoCD Application manifest updated
- [ ] No manual AWS resource changes

---

## Screenshots / Evidence

<!-- Add screenshots, test output, or performance benchmarks if relevant -->

---

## Reviewer Notes

<!-- Any specific areas to focus review on? -->
