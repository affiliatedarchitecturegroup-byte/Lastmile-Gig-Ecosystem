/**
 * SEO Metadata Generator
 * @module web-storefronts/lib/seo/metadata
 * @description Dynamic meta tag and structured data generation for storefront pages
 * @phase P200 - Storefront SEO Meta Tags
 */

/** Restaurant data needed for SEO metadata */
export interface RestaurantSeoData {
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly cuisine: string;
  readonly rating: number;
  readonly reviewCount: number;
  readonly priceRange: '$$' | '$$$' | '$$$$';
  readonly address: {
    readonly streetAddress: string;
    readonly city: string;
    readonly province: string;
    readonly postalCode: string;
    readonly country: string;
  };
  readonly phone: string;
  readonly openingHours: ReadonlyArray<string>;
  readonly coverImageUrl: string;
  readonly logoUrl: string;
  readonly averageDeliveryTime: number;
  readonly minimumOrder: number;
}

/** Menu item data for SEO */
export interface MenuItemSeoData {
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly currency: string;
  readonly image: string;
  readonly category: string;
}

/** Base URL for the storefront */
const BASE_URL = 'https://lastmilegig.aagais.co.za';
const SITE_NAME = 'Lastmile Gig';

/**
 * Generate Next.js Metadata object for a restaurant storefront page
 * Used in generateMetadata() in Next.js App Router
 */
export function generateStorefrontMetadata(restaurant: RestaurantSeoData): {
  title: string;
  description: string;
  keywords: ReadonlyArray<string>;
  openGraph: Record<string, unknown>;
  twitter: Record<string, unknown>;
  alternates: Record<string, unknown>;
  robots: Record<string, unknown>;
} {
  const title = `${restaurant.name} - Order Online | ${SITE_NAME}`;
  const description = `Order from ${restaurant.name} for delivery in ${restaurant.address.city}. ${restaurant.cuisine} cuisine. Average delivery: ${String(restaurant.averageDeliveryTime)} min. Min order: R${String(restaurant.minimumOrder)}.`;
  const url = `${BASE_URL}/store/${restaurant.slug}`;

  const keywords = [
    restaurant.name,
    restaurant.cuisine,
    'food delivery',
    restaurant.address.city,
    'order online',
    'restaurant delivery',
    'Lastmile Gig',
    'South Africa',
    `${restaurant.cuisine} food`,
    `${restaurant.address.city} delivery`,
  ];

  return {
    title,
    description: description.slice(0, 160),
    keywords,
    openGraph: {
      type: 'restaurant',
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_ZA',
      images: [
        {
          url: restaurant.coverImageUrl,
          width: 1200,
          height: 630,
          alt: `${restaurant.name} - ${restaurant.cuisine}`,
          type: 'image/webp',
        },
        {
          url: restaurant.logoUrl,
          width: 256,
          height: 256,
          alt: `${restaurant.name} logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 200),
      images: [restaurant.coverImageUrl],
      creator: '@lastmilegig',
      site: '@lastmilegig',
    },
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generate JSON-LD structured data for a restaurant
 * Schema.org Restaurant type with Menu and AggregateRating
 */
export function generateRestaurantJsonLd(
  restaurant: RestaurantSeoData,
  menuItems?: ReadonlyArray<MenuItemSeoData>,
): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    description: restaurant.description,
    url: `${BASE_URL}/store/${restaurant.slug}`,
    image: restaurant.coverImageUrl,
    logo: restaurant.logoUrl,
    servesCuisine: restaurant.cuisine,
    priceRange: restaurant.priceRange,
    telephone: restaurant.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address.streetAddress,
      addressLocality: restaurant.address.city,
      addressRegion: restaurant.address.province,
      postalCode: restaurant.address.postalCode,
      addressCountry: restaurant.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      // Will be populated from partner data
    },
    openingHoursSpecification: restaurant.openingHours.map((hours) => ({
      '@type': 'OpeningHoursSpecification',
      description: hours,
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: restaurant.rating.toFixed(1),
      reviewCount: restaurant.reviewCount,
      bestRating: '5',
      worstRating: '1',
    },
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/store/${restaurant.slug}/order`,
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: 'http://purl.org/goodrelations/v1#DeliveryModeOwnFleet',
    },
  };

  // Add menu items if provided
  if (menuItems && menuItems.length > 0) {
    jsonLd['hasMenu'] = {
      '@type': 'Menu',
      name: `${restaurant.name} Menu`,
      hasMenuSection: groupMenuByCategory(menuItems),
    };
  }

  return jsonLd;
}

/**
 * Group menu items by category for schema.org MenuSection
 */
function groupMenuByCategory(
  items: ReadonlyArray<MenuItemSeoData>,
): ReadonlyArray<Record<string, unknown>> {
  const categories = new Map<string, MenuItemSeoData[]>();

  for (const item of items) {
    const existing = categories.get(item.category) ?? [];
    existing.push(item);
    categories.set(item.category, existing);
  }

  return Array.from(categories.entries()).map(([category, categoryItems]) => ({
    '@type': 'MenuSection',
    name: category,
    hasMenuItem: categoryItems.map((item) => ({
      '@type': 'MenuItem',
      name: item.name,
      description: item.description,
      image: item.image,
      offers: {
        '@type': 'Offer',
        price: item.price.toFixed(2),
        priceCurrency: item.currency,
        availability: 'https://schema.org/InStock',
      },
    })),
  }));
}

/**
 * Generate BreadcrumbList JSON-LD for storefront navigation
 */
export function generateBreadcrumbJsonLd(
  restaurant: RestaurantSeoData,
  currentPage?: string,
): Record<string, unknown> {
  const items: Array<{ name: string; url: string }> = [
    { name: 'Home', url: BASE_URL },
    { name: 'Restaurants', url: `${BASE_URL}/store` },
    { name: restaurant.name, url: `${BASE_URL}/store/${restaurant.slug}` },
  ];

  if (currentPage) {
    items.push({
      name: currentPage,
      url: `${BASE_URL}/store/${restaurant.slug}/${currentPage.toLowerCase()}`,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate sitemap entry data for a restaurant
 */
export function generateSitemapEntry(restaurant: RestaurantSeoData): {
  url: string;
  lastModified: string;
  changeFrequency: string;
  priority: number;
} {
  return {
    url: `${BASE_URL}/store/${restaurant.slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: 0.8,
  };
}
