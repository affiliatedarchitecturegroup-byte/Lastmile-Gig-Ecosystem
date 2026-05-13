/**
 * Storefront API Client (P186)
 *
 * Server-side API client for fetching restaurant and menu data
 * from the svc-storefronts NestJS service.
 *
 * Used by Next.js Server Components for SSR data fetching.
 *
 * @module web-storefronts/lib/api/storefront-api
 * @language TypeScript (Next.js 14)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CloudinaryAsset {
  publicId: string;
  secureUrl: string;
  url: string;
  width: number;
  height: number;
  format: string;
}

interface RestaurantAddress {
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
}

interface OperatingHours {
  day: string;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  lastOrderTime: string | null;
}

export interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  description: string;
  cuisine: string[];
  logo: CloudinaryAsset | null;
  coverImage: CloudinaryAsset | null;
  address: RestaurantAddress;
  deliveryRadius: number;
  minimumOrder: number;
  avgDeliveryTime: number;
  commissionRate: number;
  operatingHours: OperatingHours[];
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  totalOrders: number;
  phone: string;
  email: string;
  website: string | null;
  seoTitle: string;
  seoDescription: string;
}

export interface MenuCategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  items: MenuItemData[];
}

export interface MenuItemData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: CloudinaryAsset[];
  allergens: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isSpicy: boolean;
  spiceLevel: number | null;
  preparationTime: number;
  isAvailable: boolean;
  options: Array<{
    name: string;
    required: boolean;
    maxSelections: number;
    choices: Array<{ label: string; priceAdjustment: number }>;
  }>;
}

export interface FullMenuData {
  restaurant: { id: string; name: string; slug: string };
  categories: MenuCategoryData[];
}

export interface PaginatedRestaurants {
  data: RestaurantData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL =
  process.env['LMG_STOREFRONT_API_URL'] || 'http://localhost:3005/v1';

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch a restaurant by its URL slug.
 */
export async function fetchRestaurant(
  slug: string,
): Promise<RestaurantData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/restaurants/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API error: ${response.status}`);
    }

    return (await response.json()) as RestaurantData;
  } catch (error) {
    console.error(`Failed to fetch restaurant: ${slug}`, error);
    return null;
  }
}

/**
 * Fetch the full menu (categories + items) for a restaurant.
 */
export async function fetchFullMenu(
  slug: string,
): Promise<FullMenuData | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/${slug}/menu`,
      { next: { revalidate: 60 } },
    );

    if (!response.ok) return null;
    return (await response.json()) as FullMenuData;
  } catch (error) {
    console.error(`Failed to fetch menu: ${slug}`, error);
    return null;
  }
}

/**
 * Fetch featured restaurants for the directory page.
 */
export async function fetchFeaturedRestaurants(): Promise<RestaurantData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/restaurants/featured`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) return [];
    return (await response.json()) as RestaurantData[];
  } catch {
    return [];
  }
}

/**
 * Fetch paginated restaurant list with filters.
 */
export async function fetchRestaurants(params: {
  page?: number;
  limit?: number;
  cuisine?: string;
  city?: string;
  search?: string;
}): Promise<PaginatedRestaurants> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.cuisine) searchParams.set('cuisine', params.cuisine);
  if (params.city) searchParams.set('city', params.city);
  if (params.search) searchParams.set('search', params.search);

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants?${searchParams.toString()}`,
      { next: { revalidate: 60 } },
    );

    if (!response.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }

    return (await response.json()) as PaginatedRestaurants;
  } catch {
    return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }
}

/**
 * Search menu items across all restaurants.
 */
export async function searchMenuItems(params: {
  query: string;
  cuisine?: string;
  maxPrice?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
}): Promise<MenuItemData[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', params.query);
  if (params.cuisine) searchParams.set('cuisine', params.cuisine);
  if (params.maxPrice) searchParams.set('maxPrice', String(params.maxPrice));
  if (params.isVegetarian) searchParams.set('isVegetarian', 'true');
  if (params.isVegan) searchParams.set('isVegan', 'true');
  if (params.isHalal) searchParams.set('isHalal', 'true');

  try {
    const response = await fetch(
      `${API_BASE_URL}/menu/search?${searchParams.toString()}`,
      { next: { revalidate: 30 } },
    );

    if (!response.ok) return [];
    return (await response.json()) as MenuItemData[];
  } catch {
    return [];
  }
}

/**
 * Place an order on a restaurant storefront.
 */
export async function placeOrder(
  restaurantSlug: string,
  orderData: Record<string, unknown>,
  token: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${API_BASE_URL}/restaurants/${restaurantSlug}/orders`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to place order');
  }

  return response.json() as Promise<Record<string, unknown>>;
}
