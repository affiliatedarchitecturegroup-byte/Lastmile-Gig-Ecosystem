# CODING STANDARDS

**Project:** Lastmile Gig Ecosystem  
**Applies To:** All languages in the polyglot stack  

---

## 1. TypeScript Standards (NestJS, Next.js, Angular, React Native)

### 1.1 Compiler Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### 1.2 Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Variables | camelCase | `driverScore` |
| Constants | SCREAMING_SNAKE | `MAX_DISPATCH_TIMEOUT` |
| Functions | camelCase | `calculateDeliveryFee()` |
| Classes | PascalCase | `DriverService` |
| Interfaces | PascalCase (no I prefix) | `Driver`, `OrderStatus` |
| Enums | PascalCase | `PaymentGateway` |
| Enum Values | SCREAMING_SNAKE | `PaymentGateway.PAYSTACK` |
| File Names | kebab-case | `driver-service.ts` |
| Test Files | kebab-case.spec | `driver-service.spec.ts` |

### 1.3 Prohibited Patterns
```typescript
// NEVER: any types
function process(data: any): any { }           // VIOLATION

// NEVER: ts-ignore
// @ts-ignore                                   // VIOLATION

// NEVER: console.log in production code
console.log('debug');                           // VIOLATION (use structured logger)

// NEVER: non-null assertion without justification
const name = user!.name;                        // VIOLATION

// ALWAYS: explicit return types
async function getDriver(id: string): Promise<Driver> { }  // CORRECT
```

---

## 2. Python Standards (FastAPI, AI Services)

### 2.1 Configuration
```toml
# pyproject.toml
[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W", "UP"]
target-version = "py312"

[tool.mypy]
strict = true
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

### 2.2 Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Variables | snake_case | `driver_score` |
| Constants | SCREAMING_SNAKE | `MAX_DISPATCH_TIMEOUT` |
| Functions | snake_case | `calculate_delivery_fee()` |
| Classes | PascalCase | `DriverService` |
| Modules | snake_case | `driver_service.py` |
| Test Files | test_ prefix | `test_driver_service.py` |

### 2.3 Type Hints (Required)
```python
# CORRECT: full type annotations
async def get_driver(driver_id: str) -> Driver:
    ...

# CORRECT: typed dict for complex state
class DispatchState(TypedDict):
    order: Order
    candidates: list[Driver]
    confidence: float
```

---

## 3. Go Standards (Dispatch Engine, Route Optimizer)

### 3.1 Project Layout
```
svc-dispatch/
  cmd/
    server/
      main.go
  internal/
    dispatch/
      engine.go
      engine_test.go
      scoring.go
    kafka/
      consumer.go
    redis/
      pool.go
  pkg/
    models/
      order.go
      driver.go
  go.mod
  go.sum
  Dockerfile
```

### 3.2 Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Packages | lowercase single word | `dispatch` |
| Exported Functions | PascalCase | `MatchDriver()` |
| Unexported Functions | camelCase | `calculateScore()` |
| Interfaces | PascalCase, -er suffix | `Dispatcher` |
| Structs | PascalCase | `DriverCandidate` |
| Constants | PascalCase or camelCase | `MaxRetries` |
| Files | snake_case | `dispatch_engine.go` |
| Test Files | _test suffix | `dispatch_engine_test.go` |

---

## 4. Rust Standards (Blockchain, IoT)

### 4.1 Configuration
```toml
# rustfmt.toml
edition = "2021"
max_width = 100
use_small_heuristics = "Default"
imports_granularity = "Crate"

# clippy.toml
cognitive-complexity-threshold = 25
```

### 4.2 Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Crates | snake_case | `blockchain_service` |
| Modules | snake_case | `delivery_verification` |
| Types/Structs | PascalCase | `TelemetryEvent` |
| Functions | snake_case | `record_delivery()` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |
| Traits | PascalCase | `BlockchainWriter` |
| Enum Variants | PascalCase | `PayoutStatus::Released` |

---

## 5. Java Standards (Spring Boot)

### 5.1 Configuration
```xml
<!-- Maven enforcer plugin for Java 21 -->
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-enforcer-plugin</artifactId>
  <configuration>
    <rules>
      <requireJavaVersion>
        <version>[21,)</version>
      </requireJavaVersion>
    </rules>
  </configuration>
</plugin>
```

### 5.2 Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Packages | lowercase dot-separated | `com.lastmilegig.payments` |
| Classes | PascalCase | `PaymentService` |
| Interfaces | PascalCase | `PaymentGateway` |
| Methods | camelCase | `processRefund()` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Files | PascalCase (match class) | `PaymentService.java` |
| Test Files | PascalCase + Test | `PaymentServiceTest.java` |

---

## 6. Elixir Standards (Phoenix)

### 6.1 Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Modules | PascalCase | `LastmileGig.Tracking` |
| Functions | snake_case | `broadcast_location/2` |
| Variables | snake_case | `driver_id` |
| Atoms | snake_case | `:order_placed` |
| Files | snake_case | `tracking_channel.ex` |
| Test Files | _test suffix | `tracking_channel_test.exs` |

---

## 7. Solidity Standards (Smart Contracts)

### 7.1 Configuration
```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  }
};
```

### 7.2 Contract Conventions
- SPDX license identifier on every file
- NatSpec comments on all public functions
- Custom errors over require strings (gas efficient)
- Events for every state change
- Access control via OpenZeppelin modifiers

---

## 8. Universal Standards (All Languages)

### 8.1 Error Handling
- Never swallow errors silently
- Use structured error types (not generic strings)
- Log errors with context (trace_id, service name, input params)
- Distinguish between operational errors (expected) and programmer errors (bugs)

### 8.2 Logging
- Use structured JSON logging in all languages
- Include `trace_id` from OTel context in every log entry
- Log levels: ERROR (alerts), WARN (investigate), INFO (audit), DEBUG (dev only)
- Never log PII (names, emails, phones, biometric data, passwords, tokens)

### 8.3 Configuration
- Environment variables with `LMG_` prefix
- No hardcoded URLs, keys, or credentials
- Service-specific config files in `config/` directory
- Validate all config at startup (fail fast on missing required values)

---

*These standards are enforced via linters, formatters, and CI pipeline checks. See .github/workflows/ci.yml for enforcement details.*
