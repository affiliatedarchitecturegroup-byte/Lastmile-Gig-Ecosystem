/**
 * Storefront Layout with SEO
 * @module web-storefronts/app/store/[slug]/layout
 * @description Layout wrapper that injects SEO metadata and JSON-LD for restaurant pages
 * @phase P200 - Storefront SEO Meta Tags
 */

import React from 'react';

import { JsonLdScript } from '../../../lib/seo/json-ld-script';
import {
  generateBreadcrumbJsonLd,
  generateRestaurantJsonLd,
} from '../../../lib/seo/metadata';
import type { RestaurantSeoData } from '../../../lib/seo/metadata';

/** Route params */
interface LayoutParams {
  readonly slug: string;
}

/** Layout props */
interface StorefrontLayoutProps {
  readonly children: React.ReactNode;
  readonly params: LayoutParams;
}

/**
 * Fetch restaurant data for SEO metadata
 * In production, this fetches from svc-storefronts NestJS API
 */
async function getRestaurantSeoData(
  slug: string,
): Promise<RestaurantSeoData | null> {
  try {
    const apiUrl = process.env.LMG_API_INTERNAL_URL ?? 'http://svc-storefronts:3000';
    const response = await fetch(`${apiUrl}/v1/restaurants/${slug}/seo`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const result: { data: RestaurantSeoData } = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Generate Next.js metadata for the storefront page
 * Called by Next.js App Router for dynamic metadata generation
 */
export async function generateMetadata({
  params,
}: {
  params: LayoutParams;
}): Promise<Record<string, unknown>> {
  const restaurant = await getRestaurantSeoData(params.slug);

  if (!restaurant) {
    return {
      title: 'Restaurant Not Found | Lastmile Gig',
      description: 'The restaurant you are looking for could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const title = `${restaurant.name} - Order Online | Lastmile Gig`;
  const description = `Order from ${restaurant.name} for delivery in ${restaurant.address.city}. ${restaurant.cuisine} cuisine. Average delivery: ${String(restaurant.averageDeliveryTime)} min.`;

  return {
    title,
    description: description.slice(0, 160),
    keywords: [
      restaurant.name,
      restaurant.cuisine,
      'food delivery',
      restaurant.address.city,
      'order online',
      'South Africa',
    ],
    openGraph: {
      type: 'restaurant',
      title,
      description,
      url: `https://lastmilegig.aagais.co.za/store/${restaurant.slug}`,
      siteName: 'Lastmile Gig',
      locale: 'en_ZA',
      images: [
        {
          url: restaurant.coverImageUrl,
          width: 1200,
          height: 630,
          alt: `${restaurant.name} - ${restaurant.cuisine}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [restaurant.coverImageUrl],
    },
    alternates: {
      canonical: `https://lastmilegig.aagais.co.za/store/${restaurant.slug}`,
    },
  };
}

/**
 * StorefrontLayout - Wraps storefront pages with JSON-LD structured data
 */
export default async function StorefrontLayout({
  children,
  params,
}: StorefrontLayoutProps): Promise<React.ReactElement> {
  const restaurant = await getRestaurantSeoData(params.slug);

  return (
    <>
      {restaurant ? (
        <>
          <JsonLdScript data={generateRestaurantJsonLd(restaurant)} />
          <JsonLdScript data={generateBreadcrumbJsonLd(restaurant)} />
        </>
      ) : null}
      {children}
    </>
  );
}
