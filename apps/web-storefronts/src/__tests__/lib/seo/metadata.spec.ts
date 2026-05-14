/**
 * SEO Metadata Generator Tests
 * @module web-storefronts/__tests__/lib/seo/metadata.spec
 * @description Unit tests for storefront SEO metadata generation
 * @phase P201 - Storefront Service Unit Tests
 */

import {
  generateBreadcrumbJsonLd,
  generateRestaurantJsonLd,
  generateSitemapEntry,
  generateStorefrontMetadata,
} from '../../../lib/seo/metadata';
import type {
  MenuItemSeoData,
  RestaurantSeoData,
} from '../../../lib/seo/metadata';

/** Test restaurant data fixture */
const mockRestaurant: RestaurantSeoData = {
  name: 'Bunny Chow Palace',
  slug: 'bunny-chow-palace',
  description: 'Authentic Durban bunny chow and Indian cuisine',
  cuisine: 'Indian',
  rating: 4.7,
  reviewCount: 342,
  priceRange: '$$',
  address: {
    streetAddress: '123 Florida Road',
    city: 'Durban',
    province: 'KwaZulu-Natal',
    postalCode: '4001',
    country: 'ZA',
  },
  phone: '+27312345678',
  openingHours: ['Mon-Fri 11:00-22:00', 'Sat-Sun 10:00-23:00'],
  coverImageUrl: 'https://res.cloudinary.com/lmg/image/upload/cover.webp',
  logoUrl: 'https://res.cloudinary.com/lmg/image/upload/logo.webp',
  averageDeliveryTime: 35,
  minimumOrder: 50,
};

/** Test menu items fixture */
const mockMenuItems: ReadonlyArray<MenuItemSeoData> = [
  {
    name: 'Quarter Mutton Bunny',
    description: 'Classic quarter loaf filled with tender mutton curry',
    price: 89.99,
    currency: 'ZAR',
    image: 'https://res.cloudinary.com/lmg/image/upload/bunny.webp',
    category: 'Bunny Chow',
  },
  {
    name: 'Chicken Biryani',
    description: 'Fragrant basmati rice with spiced chicken pieces',
    price: 119.99,
    currency: 'ZAR',
    image: 'https://res.cloudinary.com/lmg/image/upload/biryani.webp',
    category: 'Rice Dishes',
  },
  {
    name: 'Mango Lassi',
    description: 'Creamy yoghurt drink with fresh mango',
    price: 39.99,
    currency: 'ZAR',
    image: 'https://res.cloudinary.com/lmg/image/upload/lassi.webp',
    category: 'Drinks',
  },
];

describe('generateStorefrontMetadata', () => {
  it('should generate correct title with restaurant name', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.title).toBe('Bunny Chow Palace - Order Online | Lastmile Gig');
  });

  it('should include city in description', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.description).toContain('Durban');
  });

  it('should include cuisine in description', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.description).toContain('Indian');
  });

  it('should include delivery time in description', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.description).toContain('35');
  });

  it('should truncate description to 160 chars', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.description.length).toBeLessThanOrEqual(160);
  });

  it('should generate relevant keywords', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.keywords).toContain('Bunny Chow Palace');
    expect(metadata.keywords).toContain('Indian');
    expect(metadata.keywords).toContain('Durban');
    expect(metadata.keywords).toContain('food delivery');
  });

  it('should set OpenGraph type to restaurant', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.openGraph.type).toBe('restaurant');
  });

  it('should set correct canonical URL', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.alternates.canonical).toBe(
      'https://lastmilegig.aagais.co.za/store/bunny-chow-palace',
    );
  });

  it('should include cover image in OpenGraph', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    const images = metadata.openGraph.images as Array<{ url: string }>;
    expect(images[0].url).toBe(mockRestaurant.coverImageUrl);
  });

  it('should set Twitter card to summary_large_image', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.twitter.card).toBe('summary_large_image');
  });

  it('should enable indexing in robots config', () => {
    const metadata = generateStorefrontMetadata(mockRestaurant);
    expect(metadata.robots.index).toBe(true);
    expect(metadata.robots.follow).toBe(true);
  });
});

describe('generateRestaurantJsonLd', () => {
  it('should set correct @type', () => {
    const jsonLd = generateRestaurantJsonLd(mockRestaurant);
    expect(jsonLd['@type']).toBe('Restaurant');
  });

  it('should set correct @context', () => {
    const jsonLd = generateRestaurantJsonLd(mockRestaurant);
    expect(jsonLd['@context']).toBe('https://schema.org');
  });

  it('should include restaurant name', () => {
    const jsonLd = generateRestaurantJsonLd(mockRestaurant);
    expect(jsonLd.name).toBe('Bunny Chow Palace');
  });

  it('should include postal address', () => {
    const jsonLd = generateRestaurantJsonLd(mockRestaurant);
    const address = jsonLd.address as Record<string, string>;
    expect(address['@type']).toBe('PostalAddress');
    expect(address.addressLocality).toBe('Durban');
    expect(address.addressRegion).toBe('KwaZulu-Natal');
  });

  it('should include aggregate rating', () => {
    const jsonLd = generateRestaurantJsonLd(mockRestaurant);
    const rating = jsonLd.aggregateRating as Record<string, unknown>;
    expect(rating['@type']).toBe('AggregateRating');
    expect(rating.ratingValue).toBe('4.7');
    expect(rating.reviewCount).toBe(342);
  });

  it('should include OrderAction potential action', () => {
    const jsonLd = generateRestaurantJsonLd(mockRestaurant);
    const action = jsonLd.potentialAction as Record<string, unknown>;
    expect(action['@type']).toBe('OrderAction');
  });

  it('should include menu when items provided', () => {
    const jsonLd = generateRestaurantJsonLd(mockRestaurant, mockMenuItems);
    expect(jsonLd.hasMenu).toBeDefined();
    const menu = jsonLd.hasMenu as Record<string, unknown>;
    expect(menu['@type']).toBe('Menu');
  });

  it('should group menu items by category', () => {
    const jsonLd = generateRestaurantJsonLd(mockRestaurant, mockMenuItems);
    const menu = jsonLd.hasMenu as Record<string, unknown>;
    const sections = menu.hasMenuSection as Array<Record<string, unknown>>;
    expect(sections.length).toBe(3); // Bunny Chow, Rice Dishes, Drinks

    const bunnySection = sections.find((s) => s.name === 'Bunny Chow');
    expect(bunnySection).toBeDefined();
  });

  it('should not include menu when no items provided', () => {
    const jsonLd = generateRestaurantJsonLd(mockRestaurant);
    expect(jsonLd.hasMenu).toBeUndefined();
  });
});

describe('generateBreadcrumbJsonLd', () => {
  it('should set correct @type', () => {
    const jsonLd = generateBreadcrumbJsonLd(mockRestaurant);
    expect(jsonLd['@type']).toBe('BreadcrumbList');
  });

  it('should have 3 items for restaurant page', () => {
    const jsonLd = generateBreadcrumbJsonLd(mockRestaurant);
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>;
    expect(items.length).toBe(3);
  });

  it('should have 4 items when currentPage is provided', () => {
    const jsonLd = generateBreadcrumbJsonLd(mockRestaurant, 'Menu');
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>;
    expect(items.length).toBe(4);
  });

  it('should have correct positions starting from 1', () => {
    const jsonLd = generateBreadcrumbJsonLd(mockRestaurant);
    const items = jsonLd.itemListElement as Array<Record<string, number>>;
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
    expect(items[2].position).toBe(3);
  });

  it('should include Home as first breadcrumb', () => {
    const jsonLd = generateBreadcrumbJsonLd(mockRestaurant);
    const items = jsonLd.itemListElement as Array<Record<string, string>>;
    expect(items[0].name).toBe('Home');
  });
});

describe('generateSitemapEntry', () => {
  it('should generate correct URL', () => {
    const entry = generateSitemapEntry(mockRestaurant);
    expect(entry.url).toBe(
      'https://lastmilegig.aagais.co.za/store/bunny-chow-palace',
    );
  });

  it('should set changeFrequency to daily', () => {
    const entry = generateSitemapEntry(mockRestaurant);
    expect(entry.changeFrequency).toBe('daily');
  });

  it('should set priority to 0.8', () => {
    const entry = generateSitemapEntry(mockRestaurant);
    expect(entry.priority).toBe(0.8);
  });

  it('should include lastModified as ISO string', () => {
    const entry = generateSitemapEntry(mockRestaurant);
    expect(entry.lastModified).toBeDefined();
    expect(new Date(entry.lastModified).toISOString()).toBe(entry.lastModified);
  });
});
