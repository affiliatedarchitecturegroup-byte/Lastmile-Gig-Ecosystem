# Upstash Redis Key Namespace Documentation

**Phase:** P084 | Redis key namespaces defined and documented  
**Provider:** Upstash Redis (REST API)  
**Region:** af-south-1

---

## Key Naming Convention

All Redis keys follow the pattern: `lmg:{domain}:{entity}:{identifier}:{field}`

---

## Namespace Definitions

### 1. Rate Limiting
```
lmg:ratelimit:ip:{ip_address}                    Sorted set - sliding window per IP
lmg:ratelimit:apikey:{key_prefix}                 Sorted set - sliding window per API key
lmg:ratelimit:user:{user_id}                      Sorted set - sliding window per user
```
**TTL:** Matches window duration (60s default)

### 2. Driver Pool (Real-Time Availability)
```
lmg:drivers:pool:{zone}                           Sorted set - available drivers scored by performance
lmg:drivers:location:{driver_id}                  Hash - lat, lng, heading, speed, updated_at
lmg:drivers:status:{driver_id}                    String - current status enum value
lmg:drivers:active:count:{zone}                   String - counter of active drivers per zone
lmg:drivers:shift:{driver_id}                     Hash - shift start, earnings, deliveries
```
**TTL:** Location keys expire after 5 minutes (stale if no GPS update)

### 3. Dispatch Engine
```
lmg:dispatch:lock:{order_id}                      String - prevents double-dispatch (SET NX)
lmg:dispatch:queue:{zone}                         List - pending orders waiting for dispatch
lmg:dispatch:attempts:{order_id}                  String - counter of dispatch attempts
lmg:dispatch:blacklist:{order_id}:{driver_id}     String - driver rejected/timed out this order
```
**TTL:** Lock expires after 120s, blacklist after 300s

### 4. Session & Auth
```
lmg:session:{session_id}                          Hash - user session data
lmg:auth:refresh:{token_hash}                     String - refresh token validation
lmg:auth:mfa:{user_id}                            String - MFA challenge nonce
lmg:auth:failed:{ip_address}                      String - failed login counter
```
**TTL:** Sessions 24h, refresh tokens 30d, MFA 5min, failed logins 15min

### 5. Order Tracking
```
lmg:orders:active:{order_id}                      Hash - current status, driver, ETA
lmg:orders:tracking:{order_id}                    List - location breadcrumbs
lmg:orders:customer:{customer_id}:active          Set - active order IDs for a customer
```
**TTL:** Active orders expire 4h after delivery

### 6. Caching
```
lmg:cache:menu:{partner_slug}                     String (JSON) - cached menu data
lmg:cache:partner:{partner_id}                    String (JSON) - cached partner profile
lmg:cache:search:{query_hash}                     String (JSON) - cached search results
lmg:cache:config:{key}                            String - platform configuration values
```
**TTL:** Menu 15min, partner 30min, search 5min, config 60min

### 7. Real-Time Metrics
```
lmg:metrics:orders:today:{zone}                   String - counter of orders today
lmg:metrics:revenue:today                         String - revenue accumulator (ZAR cents)
lmg:metrics:drivers:online                        String - global online driver count
lmg:metrics:avg_delivery_time:{zone}              String - running average in seconds
```
**TTL:** Reset at midnight SAST (UTC+2)

### 8. Feature Flags
```
lmg:flags:{flag_name}                             String - enabled/disabled
lmg:flags:{flag_name}:percentage                  String - rollout percentage
lmg:flags:{flag_name}:users                       Set - user IDs in override list
```
**TTL:** None (managed via admin dashboard)

### 9. BullMQ Job Queues
```
lmg:queue:email                                   BullMQ queue - email dispatch
lmg:queue:sms                                     BullMQ queue - SMS dispatch
lmg:queue:push                                    BullMQ queue - push notifications
lmg:queue:payout                                  BullMQ queue - driver payouts
lmg:queue:scoring                                 BullMQ queue - driver scoring
lmg:queue:analytics                               BullMQ queue - analytics aggregation
```
**TTL:** Managed by BullMQ

---

## Memory Budget (Estimated)

| Namespace | Est. Keys | Avg Size | Total |
|---|---|---|---|
| Rate Limiting | 10,000 | 200B | ~2MB |
| Driver Pool | 5,000 | 500B | ~2.5MB |
| Dispatch | 2,000 | 100B | ~200KB |
| Sessions | 50,000 | 1KB | ~50MB |
| Order Tracking | 5,000 | 2KB | ~10MB |
| Caching | 10,000 | 5KB | ~50MB |
| Metrics | 500 | 50B | ~25KB |
| Feature Flags | 100 | 50B | ~5KB |
| BullMQ | Variable | Variable | ~100MB |
| **Total** | | | **~215MB** |

**Upstash Plan:** Pro (256MB, unlimited commands)
