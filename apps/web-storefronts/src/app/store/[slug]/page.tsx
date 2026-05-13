/**
 * Restaurant Storefront Page - SSR + ISR (P186)
 *
 * Server-rendered restaurant storefront page at /store/[slug].
 * Uses Next.js 14 App Router with ISR (60-second revalidation).
 *
 * Renders the full restaurant storefront including:
 * - StorefrontHero (banner, logo, name, status)
 * - MenuCategoryNav (sticky category tabs)
 * - MenuGrid with MenuItemCards
 * - CartDrawer (slide-out cart)
 *
 * Data fetched server-side from svc-storefronts API.
 *
 * @module web-storefronts/app/store/[slug]/page
 * @language TypeScript (Next.js 14)
 */

import { notFound } from 'next/navigation';
import { Metadata } from 'next';

import { StorefrontHero } from '@/components/storefront/storefront-hero';
import { MenuCategoryNav } from '@/components/storefront/menu-category-nav';
import { MenuGrid } from '@/components/storefront/menu-grid';
import { CartDrawer } from '@/components/storefront/cart-drawer';
import { fetchRestaurant, fetchFullMenu } from '@/lib/api/storefront-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StorefrontPageProps {
  params: { slug: string };
}

// ---------------------------------------------------------------------------
// ISR Configuration
// ---------------------------------------------------------------------------

export const revalidate = 60; // Revalidate every 60 seconds

// ---------------------------------------------------------------------------
// Metadata generation (SEO)
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const restaurant = await fetchRestaurant(params.slug);

  if (!restaurant) {
    return { title: 'Restaurant Not Found - Lastmile Gig' };
  }

  return {
    title: restaurant.seoTitle || `${restaurant.name} - Order on Lastmile Gig`,
    description:
      restaurant.seoDescription ||
      `Order food from ${restaurant.name} in ${restaurant.address?.city}. ${restaurant.cuisine?.join(', ')} cuisine. Fast delivery on Lastmile Gig.`,
    openGraph: {
      title: `${restaurant.name} - Lastmile Gig`,
      description: restaurant.description || '',
      images: restaurant.coverImage
        ? [{ url: restaurant.coverImage.secureUrl, width: 1200, height: 630 }]
        : [],
      type: 'website',
      siteName: 'Lastmile Gig',
    },
    robots: {
      index: restaurant.isActive,
      follow: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Page Component (Server Component)
// ---------------------------------------------------------------------------

export default async function StorefrontPage({
  params,
}: StorefrontPageProps): Promise<React.JSX.Element> {
  const [restaurant, menu] = await Promise.all([
    fetchRestaurant(params.slug),
    fetchFullMenu(params.slug),
  ]);

  if (!restaurant) {
    notFound();
  }

  const isOpen = checkIfOpen(restaurant.operatingHours);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero section with restaurant branding */}
      <StorefrontHero
        name={restaurant.name}
        coverImage={restaurant.coverImage}
        logo={restaurant.logo}
        cuisine={restaurant.cuisine || []}
        rating={restaurant.rating}
        avgDeliveryTime={restaurant.avgDeliveryTime}
        minimumOrder={restaurant.minimumOrder}
        isOpen={isOpen}
        address={restaurant.address}
      />

      {/* Sticky category navigation */}
      <MenuCategoryNav
        categories={menu?.categories || []}
      />

      {/* Menu grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <MenuGrid
          categories={menu?.categories || []}
          restaurantSlug={params.slug}
        />
      </div>

      {/* Cart drawer (client component) */}
      <CartDrawer
        restaurantSlug={params.slug}
        restaurantName={restaurant.name}
        minimumOrder={restaurant.minimumOrder}
        isOpen={isOpen}
      />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface OperatingHours {
  day: string;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

function checkIfOpen(hours: OperatingHours[] | undefined): boolean {
  if (!hours || hours.length === 0) return false;

  const now = new Date();
  const days = [
    'sunday', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday',
  ];
  const today = days[now.getDay()];
  const todayHours = hours.find((h) => h.day === today);

  if (!todayHours || todayHours.isClosed) return false;
  if (!todayHours.openTime || !todayHours.closeTime) return false;

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
}
