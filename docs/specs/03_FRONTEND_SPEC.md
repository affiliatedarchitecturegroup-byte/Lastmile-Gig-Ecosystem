# FRONTEND SPECIFICATION
**Document:** 03 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Frontend Architecture Overview

The Lastmile Gig frontend is a **hybrid multi-framework architecture** — not by accident, but by deliberate domain-fit design. Next.js 14 powers all market-facing surfaces requiring SEO and dynamic content. Angular 17 powers all internal operational dashboards requiring complex state, reactive data streams, and enterprise-grade component density. React Native + Expo powers both mobile apps.

```
FRAMEWORK ALLOCATION
─────────────────────────────────────────────────────────────
Next.js 14        →  Market-facing, SEO-critical, partner storefronts
Angular 17        →  Internal dashboards, fleet management, admin
React Native      →  Customer mobile app, driver mobile app
─────────────────────────────────────────────────────────────
```

---

## 2. Next.js 14 Surfaces

### 2.1 Module 01 — Corporate Landing & Investor Relations
**URL:** `lastmilegig.aagais.co.za`  
**Rendering:** Static Site Generation (SSG) with Incremental Static Regeneration (ISR)

**Pages & Routes:**
```
/                          → Hero, about, platform overview
/platform                  → All 21 modules overview
/investors                 → Investor relations dashboard (protected)
/investors/documents       → PIM, financial docs (Auth0 protected)
/partners                  → Corporate partner onboarding
/partners/apply            → Partner application form
/about                     → About Lastmile Gig + AAG context
/contact                   → Contact + request access form
/blog                      → CMS-driven content (Sanity)
/legal/popia               → POPIA compliance statement
/legal/privacy             → Privacy policy
/legal/terms               → Terms of service
```

**Key Components:**
- `<HeroSection />` — animated, full-viewport brand statement
- `<ModuleGrid />` — interactive 21-module ecosystem display
- `<TechStackDisplay />` — visual polyglot architecture diagram
- `<InvestorDashboard />` — protected route, KPI metrics, document downloads
- `<PartnerOnboardingForm />` — multi-step partner application
- `<BlogCMSRenderer />` — Sanity Portable Text renderer

**CMS Integration (Sanity):**
```typescript
// sanity.config.ts schema types
- page (corporate pages)
- blogPost
- partner (partner profiles)
- investorDocument (protected)
- teamMember
- platformModule
```

### 2.2 Module 15 — Restaurant Storefronts
**URL:** `lastmilegig.aagais.co.za/store/[slug]`  
**Rendering:** SSR with ISR (menu updates reflect within 60 seconds)

**Pages & Routes:**
```
/store                     → Partner storefront directory
/store/[slug]              → Individual restaurant storefront
/store/[slug]/menu         → Full menu with categories
/store/[slug]/order        → Order placement flow
/store/[slug]/track        → Real-time order tracking
/partner/dashboard         → Partner admin (Auth0 protected)
/partner/menu              → Menu management CMS
/partner/orders            → Live order management
/partner/analytics         → Per-partner analytics dashboard
```

**Key Components:**
```typescript
<StorefrontHero />           // Restaurant branding, hero image
<MenuCategoryNav />          // Sticky category navigation
<MenuItemCard />             // Item display with add-to-cart
<CartDrawer />               // Slide-out cart with checkout
<OrderTracker />             // Real-time delivery map + status
<PartnerMenuEditor />        // Sanity-powered menu CMS interface
<PartnerAnalyticsDash />     // Revenue, orders, peak hours charts
```

**Sanity Schema — Restaurant:**
```typescript
// types: restaurant, menuCategory, menuItem, openingHours
restaurant: {
  name, slug, description, logo, coverImage, cuisine,
  location, openingHours, deliveryRadius, minimumOrder,
  averageDeliveryTime, rating, isActive
}
menuCategory: { name, restaurant, displayOrder, isAvailable }
menuItem: {
  name, category, description, price, images, allergens,
  isVegetarian, isVegan, isAvailable, preparationTime
}
```

### 2.3 Module 07 — Customer Ordering (Web)
**URL:** `lastmilegig.aagais.co.za/order`  
**Rendering:** SSR + Client-side real-time overlay (WebSocket)

### 2.4 Module 18 — Customer Loyalty & Rewards
**URL:** `lastmilegig.aagais.co.za/rewards`  
**Rendering:** Client-side SPA (requires authentication)

---

## 3. Angular 17 Surfaces

### 3.1 Module 02 — AI Orchestration Dashboard
**URL:** `ops.lastmilegig.aagais.co.za/orchestration`

**Features:**
- Live dispatch queue with AI decision overlay
- Route optimisation visualisation (Mapbox GL)
- Demand forecasting charts (D3.js)
- Agent workflow status board (LangGraph/CrewAI)
- Kafka event stream monitor
- ERP/POS integration health panel

**Key Angular Patterns:**
```typescript
// Signals for fine-grained reactivity
dispatchQueue = signal<DispatchEvent[]>([]);
// RxJS for WebSocket real-time streams
driverLocations$ = this.wsService.connect('/drivers/locations');
// NgRx for complex shared state
store.dispatch(loadDemandForecast({ region: 'KZN', window: '24h' }));
```

### 3.2 Module 03 — Driver Rental Dashboard
**URL:** `ops.lastmilegig.aagais.co.za/drivers`

**Pages:**
```
/drivers                   → Driver list + status overview
/drivers/onboard           → Multi-step biometric onboarding
/drivers/[id]              → Individual driver profile
/drivers/[id]/rentals      → Rental history + active rental
/drivers/[id]/performance  → AI-generated performance score
/fleet/scooters            → Scooter inventory + availability
/fleet/maintenance         → Maintenance schedule + IoT alerts
```

### 3.3 Module 04 — Contracted Fleet Dashboard
**URL:** `ops.lastmilegig.aagais.co.za/fleet/contracted`

**Features:**
- Per-client fleet allocation tables
- Smart contract invoice generation
- Geo-tagged delivery verification map
- SLA compliance monitoring
- Contract lifecycle management

### 3.4 Module 14 — Admin & Compliance Console
**URL:** `admin.lastmilegig.aagais.co.za`

**Features:**
- User management with RBAC role assignment
- Audit log viewer with filtering and export
- POPIA consent management dashboard
- DFI reporting dashboard (automated report generation)
- System health overview

### 3.5 Module 11 — ESG Dashboard
**URL:** `ops.lastmilegig.aagais.co.za/esg`

**Features:**
- Real-time carbon footprint tracker (TimescaleDB feed)
- EV fleet percentage gauge
- Solar charging station status
- CrewAI ESG agent report generation panel
- DFI-formatted ESG report download

### 3.6 Module 19 — Command Centre
**URL:** `command.lastmilegig.aagais.co.za`

**Features:**
- Full-screen live map of all active deliveries (Mapbox GL)
- Driver status board (active, idle, offline)
- Incident response workflow panel
- Real-time order volume metrics
- AI anomaly alert feed

---

## 4. React Native + Expo — Mobile Apps

### 4.1 Customer Mobile App
**Platform:** iOS + Android  
**Architecture:** Expo Router (file-based navigation)

```
app/
  (tabs)/
    index.tsx          → Home feed (nearby restaurants)
    search.tsx         → Search restaurants, cuisines
    orders.tsx         → Order history + active order
    rewards.tsx        → Loyalty points and offers
    profile.tsx        → Account settings
  store/[slug].tsx     → Restaurant storefront
  checkout/index.tsx   → Checkout flow
  track/[orderId].tsx  → Live order tracking map
  auth/login.tsx       → Auth0 login
```

### 4.2 Driver Mobile App
**Platform:** Android primary (iOS secondary)

```
app/
  dashboard/index.tsx  → Earnings summary + active delivery
  deliveries/index.tsx → Available delivery queue
  deliveries/[id].tsx  → Active delivery navigation
  earnings/index.tsx   → Earnings history + instant payout
  profile/index.tsx    → Driver profile + documents
  onboarding/          → Multi-step biometric onboarding flow
  wallet/index.tsx     → Driver wallet + payout options
```

---

## 5. Design System

### 5.1 Brand Tokens
```css
/* Core Palette */
--color-black:        #090909;
--color-black-2:      #111111;
--color-black-3:      #1a1a1a;
--color-yellow:       #FFD700;
--color-yellow-2:     #FFC200;
--color-white:        #F5F5F0;
--color-olive:        #6B7C45;
--color-olive-light:  #8A9E5A;
--color-green:        #3D6B20;
--color-green-light:  #6DAB40;

/* Typography */
--font-display:  'Bebas Neue', sans-serif;    /* Headers */
--font-body:     'Space Grotesk', sans-serif; /* Body */
--font-mono:     'JetBrains Mono', monospace; /* Code, labels */

/* Spacing Scale (4px base) */
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
--space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

/* Border Radius */
--radius-sm: 2px; --radius-md: 4px; --radius-lg: 8px;
```

### 5.2 Component Library (Next.js — shadcn/ui base)
- `Button` (primary/secondary/ghost/destructive)
- `Card` (module card, stat card, partner card)
- `Badge` (status indicators, tech tags)
- `DataTable` (sortable, filterable, paginated)
- `Dialog` / `Sheet` (modals, side panels)
- `Form` (react-hook-form + zod validation)
- `Map` (Mapbox GL wrapper)
- `Chart` (Recharts wrapper)
- `Skeleton` (loading states)

### 5.3 Component Library (Angular — custom on Angular Material)
- `LmgDashboardCard` — metric card with trend indicator
- `LmgDataGrid` — AG Grid wrapper with server-side pagination
- `LmgMapPanel` — Mapbox GL Angular wrapper
- `LmgStatusBadge` — driver/order/fleet status indicator
- `LmgChartPanel` — Chart.js / D3 wrapper
- `LmgAuditLog` — scrollable, filterable audit log viewer
- `LmgAgentStatus` — CrewAI/LangGraph agent run status card

---

## 6. Performance Standards

| Metric | Target | Tool |
|---|---|---|
| Lighthouse Performance | ≥ 90 | Lighthouse CI in GitHub Actions |
| Core Web Vitals LCP | < 2.5s | Next.js built-in analytics |
| Core Web Vitals CLS | < 0.1 | Next.js built-in analytics |
| Core Web Vitals FID | < 100ms | Next.js built-in analytics |
| Time to Interactive | < 3.5s | Lighthouse CI |
| Angular Dashboard Load | < 2s (cached) | Custom Datadog RUM |
| Mobile App Launch | < 1.5s | Expo DevTools |
| Bundle Size (Next.js) | < 250KB initial JS | next/bundle-analyzer |

---

## 7. Routing & URL Structure

```
lastmilegig.aagais.co.za/          → Corporate (Next.js)
lastmilegig.aagais.co.za/store/*   → Storefronts (Next.js)
lastmilegig.aagais.co.za/order/*   → Customer ordering (Next.js)
lastmilegig.aagais.co.za/rewards/* → Loyalty (Next.js)

ops.lastmilegig.aagais.co.za/*     → Operations (Angular)
admin.lastmilegig.aagais.co.za/*   → Admin console (Angular)
command.lastmilegig.aagais.co.za/* → Command centre (Angular)

api.lastmilegig.aagais.co.za/*     → API Gateway (NestJS/AWS)
dev.lastmilegig.aagais.co.za/*     → Developer Portal (NestJS)
```

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
