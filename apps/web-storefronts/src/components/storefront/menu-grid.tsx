/**
 * MenuGrid Component (P186)
 *
 * Renders all menu categories with their items in a grid layout.
 * Each category section has an ID anchor for the sticky nav scroll.
 *
 * @module web-storefronts/components/storefront/menu-grid
 */

'use client';

import React from 'react';

import { MenuItemCard } from './menu-item-card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CloudinaryAsset {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
}

interface MenuItemData {
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

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  items: MenuItemData[];
}

export interface MenuGridProps {
  categories: CategoryData[];
  restaurantSlug: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuGrid({
  categories,
  restaurantSlug,
}: MenuGridProps): React.JSX.Element {
  if (categories.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No menu items available yet.</p>
        <p className="text-gray-400 text-sm mt-2">
          Check back soon for this restaurant&apos;s menu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 mt-6">
      {categories.map((category) => (
        <section
          key={category.id}
          id={`category-${category.slug}`}
          className="scroll-mt-32"
        >
          {/* Category header */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-sm text-gray-500 mt-1">
                {category.description}
              </p>
            )}
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.items
              .filter((item) => item.isAvailable)
              .map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  restaurantSlug={restaurantSlug}
                />
              ))}
          </div>

          {/* Unavailable items note */}
          {category.items.some((item) => !item.isAvailable) && (
            <p className="text-xs text-gray-400 mt-4">
              Some items in this category are currently unavailable.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
