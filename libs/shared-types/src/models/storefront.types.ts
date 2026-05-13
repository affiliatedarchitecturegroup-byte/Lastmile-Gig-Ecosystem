/**
 * Shared Storefront Types (P176-P185)
 *
 * Type definitions shared across the storefront service (NestJS),
 * the customer-facing storefront (Next.js), and the partner admin
 * portal for restaurant management.
 *
 * Used by:
 * - svc-storefronts (NestJS backend)
 * - web-storefronts (Next.js frontend)
 * - web-customer (Next.js ordering)
 * - dashboard-ops (Angular partner analytics)
 *
 * @module shared-types/models/storefront
 * @language TypeScript
 */

// ---------------------------------------------------------------------------
// Restaurant types
// ---------------------------------------------------------------------------

/** Restaurant entity as stored in MongoDB */
export interface Restaurant {
  id: string;
  partnerId: string;
  sanityId: string;
  name: string;
  slug: string;
  description: string;
  cuisine: CuisineType[];
  logo: CloudinaryAsset | null;
  coverImage: CloudinaryAsset | null;
  address: RestaurantAddress;
  deliveryRadius: number;
  minimumOrder: number;
  avgDeliveryTime: number;
  commissionRate: number;
  operatingHours: OperatingHoursEntry[];
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  totalOrders: number;
  phone: string;
  email: string;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Restaurant address with geolocation */
export interface RestaurantAddress {
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
}

/** Operating hours for a single day */
export interface OperatingHoursEntry {
  day: DayOfWeek;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  lastOrderTime: string | null;
}

/** Cloudinary asset reference */
export interface CloudinaryAsset {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  resourceType: string;
}

// ---------------------------------------------------------------------------
// Menu types
// ---------------------------------------------------------------------------

/** Menu category */
export interface MenuCategory {
  id: string;
  restaurantId: string;
  sanityId: string;
  name: string;
  slug: string;
  description: string | null;
  image: CloudinaryAsset | null;
  displayOrder: number;
  isActive: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  itemCount: number;
}

/** Menu item */
export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  sanityId: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: CloudinaryAsset[];
  allergens: AllergenType[];
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isKosher: boolean;
  isSpicy: boolean;
  spiceLevel: number | null;
  options: MenuItemOption[];
  preparationTime: number;
  isAvailable: boolean;
  displayOrder: number;
  nutritionalInfo: NutritionalInfo | null;
  orderCount: number;
}

/** Customisation option group for a menu item */
export interface MenuItemOption {
  name: string;
  required: boolean;
  maxSelections: number;
  choices: MenuItemChoice[];
}

/** Single choice within an option group */
export interface MenuItemChoice {
  label: string;
  priceAdjustment: number;
}

/** Nutritional information */
export interface NutritionalInfo {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
}

// ---------------------------------------------------------------------------
// Delivery zone types
// ---------------------------------------------------------------------------

/** Delivery zone with distance-based pricing */
export interface DeliveryZone {
  id: string;
  restaurantId: string;
  name: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  deliveryFee: number;
  estimatedMinutes: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Order types (storefront-specific)
// ---------------------------------------------------------------------------

/** Cart item (client-side before order placement) */
export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  specialInstructions: string | null;
  subtotal: number;
}

/** Selected option in a cart item */
export interface SelectedOption {
  optionName: string;
  choiceLabel: string;
  priceAdjustment: number;
}

/** Order placement request */
export interface PlaceOrderRequest {
  restaurantId: string;
  items: CartItem[];
  deliveryAddress: {
    formattedAddress: string;
    lat: number;
    lng: number;
  };
  paymentMethod: PaymentMethod;
  specialInstructions: string | null;
  promoCode: string | null;
}

/** Storefront order response */
export interface StorefrontOrder {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  status: StorefrontOrderStatus;
  estimatedDeliveryMinutes: number;
  placedAt: string;
  trackingUrl: string;
}

// ---------------------------------------------------------------------------
// Partner analytics types
// ---------------------------------------------------------------------------

/** Partner dashboard analytics summary */
export interface PartnerAnalytics {
  partnerId: string;
  restaurantId: string;
  period: AnalyticsPeriod;
  revenue: RevenueMetrics;
  orders: OrderMetrics;
  popularItems: PopularItem[];
  peakHours: PeakHourEntry[];
  customerRating: RatingMetrics;
}

export interface RevenueMetrics {
  total: number;
  commission: number;
  net: number;
  averageOrderValue: number;
  trend: number;
}

export interface OrderMetrics {
  total: number;
  completed: number;
  cancelled: number;
  averageDeliveryMinutes: number;
}

export interface PopularItem {
  itemId: string;
  name: string;
  orderCount: number;
  revenue: number;
  percentageOfTotal: number;
}

export interface PeakHourEntry {
  hour: number;
  dayOfWeek: DayOfWeek;
  orderCount: number;
}

export interface RatingMetrics {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type CuisineType =
  | 'fast-food' | 'pizza' | 'burgers' | 'sushi' | 'indian'
  | 'chinese' | 'italian' | 'african' | 'seafood' | 'vegetarian'
  | 'vegan' | 'halal' | 'cafe' | 'bakery' | 'fine-dining'
  | 'casual-dining' | 'street-food' | 'healthy' | 'desserts' | 'drinks';

export type AllergenType =
  | 'gluten' | 'dairy' | 'nuts' | 'eggs' | 'soy'
  | 'shellfish' | 'fish' | 'sesame';

export type DayOfWeek =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
  | 'friday' | 'saturday' | 'sunday';

export type StorefrontOrderStatus =
  | 'placed' | 'confirmed' | 'preparing' | 'ready_for_pickup'
  | 'dispatched' | 'en_route' | 'delivered' | 'cancelled' | 'refunded';

export type PaymentMethod = 'paystack' | 'ozow' | 'cash';

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';

// ---------------------------------------------------------------------------
// Sanity webhook payload
// ---------------------------------------------------------------------------

/** Sanity webhook payload for menu sync */
export interface SanityWebhookPayload {
  _id: string;
  _type: string;
  _rev: string;
  _createdAt: string;
  _updatedAt: string;
  operation: 'create' | 'update' | 'delete';
  documentId: string;
  projectId: string;
  dataset: string;
}
