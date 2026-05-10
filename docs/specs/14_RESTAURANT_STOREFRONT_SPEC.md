# RESTAURANT STOREFRONT SPECIFICATION
**Document:** 14 of 19 | **Version:** 1.0 | **Classification:** Confidential

---

## 1. Module Overview

Module 15 — Restaurant Storefronts — is the Uber Eats-equivalent surface of the Lastmile Gig platform. Every restaurant, cafe, fast food outlet, and fine dining establishment gets a fully branded, SEO-optimised, high-performance storefront on `lastmilegig.aagais.co.za/store/[slug]`.

**Partner Types Supported:**
- Fast food chains (e.g. local Durban outlets, franchise partners)
- Cafes and coffee shops
- Casual dining restaurants
- Fine dining establishments
- Hotels (in-room dining and restaurant)
- Ghost kitchens / cloud kitchens
- Bakeries and specialty food

---

## 2. Storefront Architecture

```
Partner uploads menu (Sanity CMS admin)
          ↓
Sanity webhook triggers menu sync → svc-storefronts (NestJS)
          ↓
Menu written to MongoDB Atlas (menus collection)
Images uploaded to Cloudinary via CMS
          ↓
Next.js 14 storefront page renders via SSR + ISR (60s revalidation)
Menu search indexed in AWS OpenSearch (Elasticsearch)
          ↓
Customer places order → svc-storefronts API → Kafka → svc-orders
          ↓
Real-time order status via Elixir Phoenix Channel (WebSocket)
```

---

## 3. Storefront Page Specification

### 3.1 URL Structure
```
/store                             → Partner directory (searchable)
/store/[slug]                      → Restaurant storefront home
/store/[slug]/menu                 → Full menu with categories
/store/[slug]/menu/[category]      → Category-filtered menu
/store/[slug]/order                → Checkout flow
/store/[slug]/order/[id]/track     → Real-time order tracking
```

### 3.2 Storefront Page Sections
```typescript
// Each storefront page renders:
<StorefrontHero
  coverImage={restaurant.coverImage}        // Cloudinary-hosted, WebP optimised
  logo={restaurant.logo}
  name={restaurant.name}
  cuisine={restaurant.cuisine}
  rating={restaurant.rating}
  deliveryTime={restaurant.avgDeliveryTime} // from AI forecast
  minimumOrder={restaurant.minimumOrder}
  isOpen={restaurant.isCurrentlyOpen}       // real-time opening hours check
/>

<MenuCategoryNav categories={menu.categories} sticky />  // sticky on scroll

<MenuGrid>
  {categories.map(cat => (
    <MenuCategory key={cat.id} title={cat.name}>
      {cat.items.map(item => (
        <MenuItemCard
          key={item.id}
          name={item.name}
          description={item.description}
          price={item.price}
          image={item.images[0]}           // Cloudinary with lazy loading
          allergens={item.allergens}
          badges={[item.isVegetarian && 'Vegetarian', item.isVegan && 'Vegan']}
          onAddToCart={() => addToCart(item)}
        />
      ))}
    </MenuCategory>
  ))}
</MenuGrid>

<CartDrawer />                            // Slide-out, sticky to viewport
<CheckoutFlow steps={['cart', 'address', 'payment', 'confirmation']} />
```

### 3.3 Partner Admin Portal
```
/partner/dashboard          → Revenue overview, today's orders, quick stats
/partner/menu               → Menu management (Sanity CMS embedded)
/partner/menu/items/new     → Add new menu item with image upload
/partner/orders             → Live order queue (WebSocket real-time)
/partner/orders/[id]        → Individual order detail + status update
/partner/analytics          → Revenue charts, peak hours, popular items
/partner/analytics/export   → CSV/PDF export of analytics data
/partner/settings           → Opening hours, delivery radius, minimum order
/partner/profile            → Business details, branding, contact info
```

---

## 4. Menu Management CMS (Sanity)

Partners manage menus through an embedded Sanity Studio interface:

```typescript
// Sanity Studio embedded at /partner/menu
// Custom input components for restaurant-specific fields

export const menuItemSchema = {
  name: 'menuItem',
  type: 'document',
  fields: [
    { name: 'name', type: 'string', validation: r => r.required().max(80) },
    { name: 'description', type: 'text', validation: r => r.max(300) },
    { name: 'price', type: 'number', validation: r => r.required().positive() },
    { name: 'images', type: 'array', of: [{ type: 'cloudinary.asset' }] },
    { name: 'category', type: 'reference', to: [{ type: 'menuCategory' }] },
    { name: 'allergens', type: 'array', of: [{ type: 'string' }],
      options: { list: ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'shellfish', 'halal', 'kosher'] }
    },
    { name: 'isVegetarian', type: 'boolean', initialValue: false },
    { name: 'isVegan', type: 'boolean', initialValue: false },
    { name: 'isAvailable', type: 'boolean', initialValue: true },
    { name: 'preparationTime', type: 'number' },  // minutes
    { name: 'displayOrder', type: 'number' },
  ]
}
```

---

## 5. Per-Partner Analytics Dashboard

Each partner dashboard shows:

| Metric | Visualisation | Update Frequency |
|---|---|---|
| Today's revenue | Big number + sparkline | Real-time (WebSocket) |
| Orders today vs yesterday | Bar comparison | Real-time |
| Peak hours heatmap | 7-day heatmap grid | Hourly |
| Popular items | Ranked list with % | Daily |
| Average order value | Trend line (30 days) | Daily |
| Customer rating | Star rating + comments | Real-time |
| Delivery time performance | Target vs actual histogram | Daily |
| Commission summary | Monthly statement | Monthly |

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
