/**
 * Partner (Restaurant/Corporate) type definitions.
 * Maps to the `partners` table in Supabase PostgreSQL.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 */

import { PartnerStatus, PartnerType } from '../enums';

export interface Partner {
  id: string;
  name: string;
  slug: string;
  type: PartnerType;
  cipcNumber: string | null;
  vatNumber: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: PartnerAddress;
  status: PartnerStatus;
  slaContractId: string | null;
  createdAt: string;
}

export interface PartnerAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

export interface Restaurant extends Partner {
  cuisine: string[];
  logo: string | null;
  coverImage: string | null;
  deliveryRadius: number;
  minimumOrder: number;
  averageDeliveryTime: number;
  rating: number;
  isActive: boolean;
  openingHours: OpeningHours[];
}

export interface OpeningHours {
  day: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categoryId: string;
  allergens: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isAvailable: boolean;
  preparationTime: number;
  displayOrder: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  restaurantId: string;
  displayOrder: number;
  isAvailable: boolean;
  items: MenuItem[];
}

export interface PartnerAnalytics {
  todayRevenue: number;
  todayOrders: number;
  yesterdayOrders: number;
  averageOrderValue: number;
  averageRating: number;
  peakHours: number[];
  popularItems: Array<{ itemId: string; name: string; count: number }>;
}
