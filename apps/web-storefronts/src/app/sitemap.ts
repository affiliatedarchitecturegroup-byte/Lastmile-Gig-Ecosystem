/**
 * Dynamic Sitemap Generator
 * @module web-storefronts/app/sitemap
 * @description Generates XML sitemap for all restaurant storefronts
 * @phase P200 - Storefront SEO Meta Tags
 */

const BASE_URL = 'https://lastmilegig.aagais.co.za';

/** Sitemap entry structure (Next.js App Router format) */
interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority: number;
}

/** Restaurant slug from API */
interface RestaurantSlug {
  slug: string;
  updatedAt: string;
}

/**
 * Fetch all restaurant slugs for sitemap generation
 */
async function getAllRestaurantSlugs(): Promise<ReadonlyArray<RestaurantSlug>> {
  try {
    const apiUrl =
      process.env.LMG_API_INTERNAL_URL ?? 'http://svc-storefronts:3000';
    const response = await fetch(`${apiUrl}/v1/restaurants/slugs`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) return [];

    const result: { data: ReadonlyArray<RestaurantSlug> } =
      await response.json();
    return result.data;
  } catch {
    return [];
  }
}

/**
 * Next.js App Router sitemap() function
 * Generates sitemap.xml at build time + ISR
 */
export default async function sitemap(): Promise<SitemapEntry[]> {
  const restaurants = await getAllRestaurantSlugs();

  // Static pages
  const staticPages: SitemapEntry[] = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/store`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Dynamic restaurant pages
  const restaurantPages: SitemapEntry[] = restaurants.map((restaurant) => ({
    url: `${BASE_URL}/store/${restaurant.slug}`,
    lastModified: new Date(restaurant.updatedAt),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Restaurant menu pages
  const menuPages: SitemapEntry[] = restaurants.map((restaurant) => ({
    url: `${BASE_URL}/store/${restaurant.slug}/menu`,
    lastModified: new Date(restaurant.updatedAt),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...restaurantPages, ...menuPages];
}
