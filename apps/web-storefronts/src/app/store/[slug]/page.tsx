/**
 * Restaurant Storefront Page - SSR with ISR.
 *
 * Dynamic route: /store/[slug]
 * Renders the full restaurant storefront with hero, menu, and ordering.
 * Uses Incremental Static Regeneration for fast page loads.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts
 */

import { notFound } from 'next/navigation';
import { StorefrontHero } from '../../../components/storefront/storefront-hero';
import { MenuCategoryNav } from '../../../components/storefront/menu-category-nav';
import { MenuSection } from '../../../components/storefront/menu-section';
import { CartDrawer } from '../../../components/storefront/cart-drawer';
import type { Metadata } from 'next';

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  description: string;
  partnerType: string;
  heroImageUrl: string | null;
  logoUrl: string | null;
  cuisine: string[];
  address: {
    street: string;
    city: string;
    province: string;
  };
  rating: number;
  reviewCount: number;
  averageDeliveryTime: number;
  minimumOrder: number;
  isActive: boolean;
  operatingHours: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
}

interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  items: MenuItem[];
}

interface MenuItem {
  _id: string;
  name: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  cloudinaryUrl: string | null;
  tags: string[];
  allergens: string[];
  dietaryFlags: string[];
  isAvailable: boolean;
  isPopular: boolean;
  preparationTime: number;
}

interface FullMenu {
  categories: MenuCategory[];
  popularItems: MenuItem[];
  totalItems: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005/v1';

async function getRestaurant(slug: string): Promise<Restaurant | null> {
  try {
    const res = await fetch(`${API_BASE}/restaurants/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

async function getMenu(slug: string): Promise<FullMenu | null> {
  try {
    const res = await fetch(`${API_BASE}/restaurants/${slug}/menu`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const restaurant = await getRestaurant(params.slug);
  if (!restaurant) return { title: 'Restaurant Not Found' };

  return {
    title: `${restaurant.name} | Order on Lastmile Gig`,
    description: restaurant.description || `Order from ${restaurant.name} for delivery`,
    openGraph: {
      title: restaurant.name,
      description: restaurant.description || '',
      type: 'website',
      url: `https://lastmilegig.aagais.co.za/store/${restaurant.slug}`,
      images: restaurant.heroImageUrl ? [{ url: restaurant.heroImageUrl }] : [],
    },
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: { slug: string };
}) {
  const [restaurant, menu] = await Promise.all([
    getRestaurant(params.slug),
    getMenu(params.slug),
  ]);

  if (!restaurant || !restaurant.isActive) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <StorefrontHero restaurant={restaurant} />

      {menu && menu.categories.length > 0 && (
        <>
          <MenuCategoryNav categories={menu.categories} />
          <div className="max-w-7xl mx-auto px-4 py-8">
            {menu.categories.map((category) => (
              <MenuSection key={category._id} category={category} />
            ))}
          </div>
        </>
      )}

      {(!menu || menu.totalItems === 0) && (
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 text-lg">
            Menu coming soon. Check back later.
          </p>
        </div>
      )}

      <CartDrawer restaurantName={restaurant.name} minimumOrder={restaurant.minimumOrder} />
    </main>
  );
}
