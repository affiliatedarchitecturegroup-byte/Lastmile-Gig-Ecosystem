# CONTRIBUTIONS GUIDE

**Project:** Lastmile Gig Ecosystem  
**Repository:** `affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem`  

---

## 1. Getting Started

### 1.1 Prerequisites
- Node.js >= 20.x LTS
- Python >= 3.12
- Go >= 1.22
- Rust >= 1.78 (via rustup)
- Java >= 21 (OpenJDK)
- Elixir >= 1.16 + Erlang/OTP >= 26
- Docker >= 25.x + Docker Compose >= 2.x
- Terraform >= 1.7
- Nx CLI (`npm i -g nx`)

### 1.2 Repository Clone & Setup
```bash
git clone https://github.com/affiliatedarchitecturegroup-byte/Lastmile-Gig-Ecosystem.git
cd Lastmile-Gig-Ecosystem
npm install          # Install root dependencies + Nx
cp .env.example .env.local  # Configure local environment
```

### 1.3 Local Development
```bash
# Start all local services (Docker Compose)
docker compose -f docker-compose.dev.yml up -d

# Run a specific service
nx serve api-gateway
nx serve web-corporate
nx serve dashboard-ops
```

---

## 2. Branch Strategy

### 2.1 Branch Naming Convention
```
main                                    Protected. Production-ready code only.
develop                                 Integration branch. All features merge here first.
wave/{phase}-{session}-{wave}/{desc}    Wave development branches
feature/{module}/{description}          Feature development
fix/{module}/{description}              Bug fixes
hotfix/{description}                    Production hotfixes
docs/{description}                      Documentation changes
infra/{description}                     Infrastructure changes
```

### 2.2 Branch Protection Rules
- `main`: Requires 1+ approving review, passing CI, no direct pushes
- `develop`: Requires passing CI
- All branches: Conventional commit messages enforced

---

## 3. Commit Standards

### 3.1 Conventional Commits (Required)
```
feat(scope): add new feature
fix(scope): fix a bug
docs(scope): documentation changes
test(scope): add or update tests
chore(scope): maintenance tasks
refactor(scope): code restructuring without behavior change
perf(scope): performance improvements
security(scope): security fixes or improvements
ci(scope): CI/CD pipeline changes
```

### 3.2 Scope Values
```
auth, gateway, orders, drivers, fleet, storefronts, payments,
dispatch, tracking, comms, blockchain, iot, ai, agents, analytics,
logistics, esg, loyalty, insurance, admin, corporate, investor,
developer-portal, command-centre, shared-types, shared-ui, shared-utils,
infra, terraform, helm, docker, ci
```

### 3.3 Commit Message Examples
```
feat(dispatch): implement goroutine pool per region for parallel matching
fix(payments): correct Ozow payout amount rounding to ZAR cents
docs(blockchain): update smart contract deployment steps in ADR-003
test(ai): add unit tests for LangGraph fraud investigation graph
chore(deps): upgrade LangChain to 0.3.1
security(auth): enforce MFA for all admin role accounts
```

---

## 4. Pull Request Process

### 4.1 PR Requirements
Every pull request must include:
- [ ] Clear description linked to phase number (`Implements Phase P045`)
- [ ] All tests written and passing
- [ ] No new Snyk HIGH/CRITICAL vulnerabilities
- [ ] SonarQube quality gate passed (Coverage >= 80%)
- [ ] API changes reflected in OpenAPI spec
- [ ] Database migrations included if schema changed
- [ ] Relevant documentation updated
- [ ] LoC count for the wave recorded

### 4.2 PR Review Criteria
Reviewers check:
1. Adherence to DEVELOPMENT_DIRECTIVES.md
2. Language discipline (correct language for domain)
3. Security controls present (auth, validation, RLS)
4. Test coverage meets thresholds
5. No `any` types in TypeScript
6. No PII in logs
7. OTel instrumentation present
8. File size within 1,800 LoC hard cap

---

## 5. Code Review Standards

### 5.1 Review Expectations
- Respond to PR reviews within 4 hours during business hours
- Address all review comments before requesting re-review
- Use GitHub suggestion feature for small changes
- Resolve conversations only after changes are made

### 5.2 Approval Requirements
| Change Type | Required Approvals |
|---|---|
| Standard feature | 1 approver |
| Security-related | 2 approvers (1 must be security lead) |
| Database migration | 2 approvers |
| Smart contract | 2 approvers + audit |
| Infrastructure (Terraform) | 2 approvers |

---

## 6. Wave Development Workflow

```
1. Create wave branch: git checkout -b wave/p001-s1-w1/monorepo-scaffold
2. Implement minimum 7 tasks/files per wave
3. Write tests alongside implementation
4. Run linting: nx lint affected
5. Run tests: nx test affected
6. Count LoC: find . -name '*.ts' | xargs wc -l
7. Commit with conventional messages
8. Push and create PR using template
9. After review + merge, update PROJECT_STATUS.md
10. Calculate cumulative LoC for session
```

---

## 7. File Size Monitoring

### 7.1 LoC Counting Commands
```bash
# Count LoC for a specific language
find apps/ libs/ -name '*.ts' -not -path '*/node_modules/*' | xargs wc -l
find apps/ -name '*.py' -not -path '*/__pycache__/*' | xargs wc -l
find apps/ -name '*.go' | xargs wc -l
find apps/ -name '*.rs' | xargs wc -l
find apps/ -name '*.java' | xargs wc -l
find apps/ -name '*.ex' -o -name '*.exs' | xargs wc -l
find contracts/ -name '*.sol' | xargs wc -l
find infrastructure/ -name '*.tf' -o -name '*.hcl' | xargs wc -l

# Total project LoC
cloc . --exclude-dir=node_modules,dist,build,.next,target,_build
```

---

## 8. Issue Tracking

### 8.1 Issue Labels
```
phase:P001-P030      Foundation phases
phase:P031-P050      Observability phases
phase:P051-P070      Security phases
...
priority:critical    Must fix immediately
priority:high        Fix within 24h
priority:medium      Fix within sprint
priority:low         Backlog
type:bug             Bug report
type:feature         Feature request
type:security        Security issue
type:performance     Performance issue
lang:typescript      TypeScript related
lang:python          Python related
lang:go              Go related
lang:rust            Rust related
lang:java            Java related
lang:elixir          Elixir related
```

---

*All contributors must read DEVELOPMENT_DIRECTIVES.md before making any code changes.*
