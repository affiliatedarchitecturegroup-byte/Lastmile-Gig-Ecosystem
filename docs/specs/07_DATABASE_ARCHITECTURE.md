# DATABASE ARCHITECTURE
**Document:** 07 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Multi-Database Strategy

Lastmile Gig uses a **polyglot persistence** approach — each database is selected for the data access patterns of its domain, not for uniformity.

```
DATABASE          PROVIDER          TYPE          PRIMARY DOMAINS
──────────────────────────────────────────────────────────────────────
PostgreSQL        Supabase          Relational    Users, orders, drivers, contracts
MongoDB           MongoDB Atlas     Document      Event logs, menus, partner records
Redis             Upstash           Cache/Queue   Sessions, rate limits, job queues
TimescaleDB       Supabase ext.     Time-Series   IoT telemetry, carbon, metrics
Elasticsearch     AWS OpenSearch    Search        Menu search, driver discovery
Pinecone          Pinecone Cloud    Vector        RAG embeddings, semantic retrieval
```

---

## 2. Supabase (PostgreSQL) — Primary Relational Store

### 2.1 Configuration
```
Plan:            Pro (custom instance for production)
Region:          af-south-1 (Cape Town) primary, eu-west-1 DR replica
Connection Pool: PgBouncer (transaction pooling, max 1000 connections)
Extensions:      timescaledb, pgvector, uuid-ossp, pg_trgm, postgis
Realtime:        Enabled (Supabase Realtime for live subscriptions)
Auth:            Supabase Auth (wraps Auth0 JWT validation)
Row Level Security (RLS): Enabled on all tables
```

### 2.2 Core Schema

```sql
-- USERS & IDENTITY
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    role            user_role NOT NULL,  -- 'customer' | 'driver' | 'partner' | 'admin' | 'ops'
    auth0_id        TEXT UNIQUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,  -- soft delete for POPIA right to erasure
    popia_consent   BOOLEAN DEFAULT FALSE,
    popia_consent_at TIMESTAMPTZ
);

-- DRIVERS
CREATE TABLE drivers (
    id              UUID PRIMARY KEY REFERENCES users(id),
    licence_number  TEXT,
    licence_expiry  DATE,
    biometric_ref   TEXT,           -- reference to biometric vault (not stored here)
    vehicle_type    vehicle_type,   -- 'scooter' | 'bicycle' | 'car' | 'van'
    status          driver_status,  -- 'active' | 'idle' | 'offline' | 'suspended'
    performance_score DECIMAL(5,2), -- 0–100, updated by SageMaker weekly
    zone            TEXT,           -- 'KZN-North' | 'KZN-South' | 'Gauteng' | etc.
    wallet_address  TEXT,           -- Polygon CDK wallet for smart contract payouts
    onboarded_at    TIMESTAMPTZ,
    insurance_tier  TEXT            -- 'basic' | 'standard' | 'premium'
);

-- RESTAURANTS / PARTNERS
CREATE TABLE partners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    type            partner_type,  -- 'restaurant' | 'cafe' | 'fastfood' | 'finedining' | 'hotel' | 'corporate' | 'enterprise'
    cipc_number     TEXT,
    vat_number      TEXT,
    contact_email   TEXT,
    contact_phone   TEXT,
    address         JSONB,          -- {street, city, province, postal_code, lat, lng}
    bank_details    JSONB,          -- encrypted, stored via Vault reference
    status          TEXT,           -- 'pending' | 'active' | 'suspended'
    sla_contract_id TEXT,           -- Polygon CDK contract address
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID REFERENCES users(id),
    partner_id      UUID REFERENCES partners(id),
    driver_id       UUID REFERENCES drivers(id),
    status          order_status,   -- 'placed' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled'
    items           JSONB,          -- array of {item_id, name, quantity, unit_price}
    subtotal        DECIMAL(10,2),
    delivery_fee    DECIMAL(10,2),
    total           DECIMAL(10,2),
    payment_method  TEXT,
    payment_ref     TEXT,           -- gateway transaction reference
    delivery_address JSONB,         -- {street, lat, lng, instructions}
    placed_at       TIMESTAMPTZ DEFAULT NOW(),
    dispatched_at   TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    delivery_photo_hash TEXT,       -- IPFS/S3 reference to proof photo
    blockchain_tx   TEXT,           -- Polygon CDK transaction hash
    cancelled_at    TIMESTAMPTZ,
    cancel_reason   TEXT
);

-- VEHICLES / FLEET
CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration    TEXT UNIQUE,
    type            vehicle_type,
    make            TEXT,
    model           TEXT,
    year            INTEGER,
    is_ev           BOOLEAN DEFAULT FALSE,
    status          TEXT,           -- 'available' | 'rented' | 'maintenance' | 'retired'
    current_driver_id UUID REFERENCES drivers(id),
    odometer_km     DECIMAL(10,2),
    last_service_date DATE,
    next_service_km  DECIMAL(10,2),
    iot_device_id   TEXT            -- reference to IoT sensor unit
);

-- PAYMENTS
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID REFERENCES orders(id),
    amount          DECIMAL(10,2),
    currency        TEXT DEFAULT 'ZAR',
    gateway         TEXT,           -- 'paystack' | 'stripe' | 'ozow' | 'peach' | 'polygon'
    gateway_ref     TEXT,
    status          TEXT,           -- 'pending' | 'completed' | 'failed' | 'refunded'
    payout_type     TEXT,           -- 'customer_charge' | 'driver_payout' | 'partner_settlement'
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- SLA CONTRACTS
CREATE TABLE sla_contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      UUID REFERENCES partners(id),
    delivery_target_minutes INTEGER,
    breach_penalty_zar DECIMAL(10,2),
    perfect_week_bonus_zar DECIMAL(10,2),
    contract_start  DATE,
    contract_end    DATE,
    blockchain_address TEXT,        -- Polygon CDK PartnerSLA contract address
    active          BOOLEAN DEFAULT TRUE
);

-- AUDIT LOG (POPIA + GDPR compliance)
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID,           -- who performed the action
    action          TEXT,           -- 'update_user' | 'delete_data' | 'export_data' etc.
    resource_type   TEXT,
    resource_id     UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Row Level Security (RLS) Examples
```sql
-- Customers can only read their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_own_orders" ON orders
    FOR SELECT USING (customer_id = auth.uid());

-- Drivers can only see orders assigned to them
CREATE POLICY "driver_assigned_orders" ON orders
    FOR SELECT USING (driver_id = (SELECT id FROM drivers WHERE id = auth.uid()));

-- Partners can only see orders from their own restaurant
CREATE POLICY "partner_own_orders" ON orders
    FOR SELECT USING (partner_id IN (
        SELECT id FROM partners WHERE contact_email = auth.email()
    ));
```

### 2.4 Supabase Realtime Subscriptions
```typescript
// Customer subscribes to their active order status
const channel = supabase
  .channel(`order:${orderId}`)
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'orders',
    filter: `id=eq.${orderId}`
  }, (payload) => updateOrderStatus(payload.new))
  .subscribe();

// Ops team subscribes to all new orders (Command Centre)
const opsChannel = supabase
  .channel('orders:new')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'orders'
  }, (payload) => addToCommandCentre(payload.new))
  .subscribe();
```

---

## 3. MongoDB Atlas — Document Store

### 3.1 Configuration
```
Tier:        M30 (production) — 8GB RAM, 2 vCPUs
Region:      AWS af-south-1 (Cape Town)
Replication: 3-node replica set
Backup:      Continuous backup (point-in-time recovery, 7 days)
Encryption:  At-rest (AES-256) + TLS in transit
```

### 3.2 Collections

**`delivery_events`** — Append-only event log for all delivery lifecycle events
```javascript
{
  _id: ObjectId,
  orderId: "uuid",
  eventType: "order.placed" | "dispatched" | "delivered" | ...,
  timestamp: ISODate,
  payload: {
    driverId, partnerId, customerId,
    location: { lat, lng },
    metadata: {}
  },
  kafkaOffset: NumberLong,
  processed: Boolean
}
```

**`menus`** — Denormalised menu data for fast storefront rendering
```javascript
{
  _id: ObjectId,
  partnerId: "uuid",
  slug: "nomvulas-kitchen",
  categories: [
    {
      name: "Mains",
      displayOrder: 1,
      items: [
        {
          id: "uuid",
          name: "Grilled Karoo Lamb",
          description: "...",
          price: 285.00,
          images: ["cloudinary-url"],
          allergens: ["gluten"],
          isVegetarian: false,
          isAvailable: true,
          preparationTime: 25
        }
      ]
    }
  ],
  lastSyncedAt: ISODate,  // synced from Sanity CMS
  version: 42
}
```

**`agent_runs`** — Full LangGraph/CrewAI agent execution records
```javascript
{
  _id: ObjectId,
  runId: "uuid",
  agentType: "dispatch_decision" | "fraud_investigation" | "esg_report" | ...,
  startedAt: ISODate,
  completedAt: ISODate,
  status: "completed" | "hitl_pending" | "failed",
  confidence: 0.87,
  hitlRequired: false,
  inputs: {},
  outputs: {},
  stateSnapshots: [],   // full LangGraph state at each node
  toolCalls: [],
  tokenUsage: { input: 1240, output: 380 }
}
```

---

## 4. Upstash Redis — Cache & Queue Layer

### 4.1 Configuration
```
Plan:        Pay-as-you-go (serverless — scales to zero)
Region:      AWS af-south-1
Eviction:    allkeys-lru
Max Memory:  4GB (soft limit, auto-scales)
TLS:         Enforced
```

### 4.2 Key Namespaces
```
session:{userId}                → User session data (TTL: 24h)
ratelimit:{apiKey}:{window}     → Rate limiting counters (TTL: 60s)
ratelimit:{ip}:{endpoint}       → IP-level rate limits (TTL: 60s)
cache:menu:{slug}               → Restaurant menu cache (TTL: 60s, ISR-aligned)
cache:driver:pool:{zone}        → Available driver pool per zone (TTL: 10s)
cache:demand:{zone}:{hour}      → Demand forecast cache (TTL: 30min)
geo:driver:{driverId}           → Driver last-known location (TTL: 30s)
lock:dispatch:{orderId}         → Dispatch lock (prevents double-dispatch, TTL: 5s)
queue:notifications             → BullMQ notification job queue
queue:reports                   → BullMQ report generation queue
queue:blockchain                → BullMQ blockchain write queue (async, retryable)
```

### 4.3 BullMQ Job Queues
```typescript
// notification queue — all SMS/email/push jobs
const notificationQueue = new Queue('notifications', { connection: upstashRedis });

// blockchain write queue — async, with exponential backoff retry
const blockchainQueue = new Queue('blockchain', {
  connection: upstashRedis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 }
  }
});

// scheduled jobs
const reportQueue = new Queue('reports', { connection: upstashRedis });
await reportQueue.add('esg-monthly', {}, { repeat: { cron: '0 6 1 * *' } });  // 1st of month, 6am
await reportQueue.add('demand-forecast', {}, { repeat: { cron: '0 */4 * * *' } }); // every 4h
```

---

## 5. TimescaleDB — IoT & Time-Series Data

**Hosted:** Supabase TimescaleDB extension (same PostgreSQL instance, separate hypertable)

```sql
-- VEHICLE TELEMETRY HYPERTABLE
CREATE TABLE vehicle_telemetry (
    time            TIMESTAMPTZ NOT NULL,
    vehicle_id      UUID NOT NULL,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    speed_kmh       REAL,
    battery_pct     REAL,           -- EV only
    engine_temp_c   REAL,
    fuel_pct        REAL,
    odometer_km     REAL,
    error_codes     TEXT[]
);
SELECT create_hypertable('vehicle_telemetry', 'time');

-- Retention policy: 90 days hot, then export to S3 Parquet
SELECT add_retention_policy('vehicle_telemetry', INTERVAL '90 days');

-- Continuous aggregate for dashboard (hourly averages)
CREATE MATERIALIZED VIEW vehicle_hourly_avg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    vehicle_id,
    AVG(speed_kmh) AS avg_speed,
    AVG(battery_pct) AS avg_battery,
    AVG(engine_temp_c) AS avg_temp
FROM vehicle_telemetry
GROUP BY bucket, vehicle_id;

-- CARBON FOOTPRINT TRACKING
CREATE TABLE carbon_events (
    time        TIMESTAMPTZ NOT NULL,
    vehicle_id  UUID NOT NULL,
    route_km    REAL,
    is_ev       BOOLEAN,
    co2_kg      REAL,              -- calculated: route_km * emission_factor
    zone        TEXT
);
SELECT create_hypertable('carbon_events', 'time');
```

---

## 6. Elasticsearch (AWS OpenSearch) — Search

```
Instance:    r6g.large.search (2 vCPU, 16GB RAM)
Replicas:    2 shards, 1 replica per shard
Region:      AWS af-south-1
```

**Indices:**
```json
// menus index — for restaurant and menu item search
PUT /menus
{
  "mappings": {
    "properties": {
      "partnerId": { "type": "keyword" },
      "restaurantName": { "type": "text", "analyzer": "standard" },
      "cuisine": { "type": "keyword" },
      "itemName": { "type": "text" },
      "itemDescription": { "type": "text" },
      "price": { "type": "float" },
      "allergens": { "type": "keyword" },
      "isVegetarian": { "type": "boolean" },
      "location": { "type": "geo_point" }
    }
  }
}

// drivers index — for zone-based driver discovery
PUT /drivers
{
  "mappings": {
    "properties": {
      "driverId": { "type": "keyword" },
      "zone": { "type": "keyword" },
      "status": { "type": "keyword" },
      "performanceScore": { "type": "float" },
      "vehicleType": { "type": "keyword" },
      "currentLocation": { "type": "geo_point" }
    }
  }
}
```

---

## 7. Data Backup & Disaster Recovery

| Database | Backup Strategy | RTO | RPO |
|---|---|---|---|
| Supabase PostgreSQL | Continuous WAL + daily snapshots to S3 | 30 min | 5 min |
| MongoDB Atlas | Continuous backup (point-in-time, 7 days) | 15 min | 1 min |
| Upstash Redis | AOF persistence + daily snapshots | 5 min | 1 min |
| TimescaleDB | Shared with Supabase PostgreSQL backup | 30 min | 5 min |
| AWS OpenSearch | Automated daily snapshots to S3 | 1 hour | 24 hours |
| Pinecone | Managed (Pinecone SLA) | N/A (managed) | N/A |

**DR Region:** All primary data stores have read replicas or cross-region snapshots in `eu-west-1` (Ireland).

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
