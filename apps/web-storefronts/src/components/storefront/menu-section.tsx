/**
 * MenuSection Component - Renders a menu category with its items.
 *
 * Displays category name, description, and a grid of MenuItemCard components.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts
 */

'use client';

import { MenuItemCard } from './menu-item-card';

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

interface Category {
  _id: string;
  name: string;
  description: string | null;
  items: MenuItem[];
}

export function MenuSection({ category }: { category: Category }) {
  if (category.items.length === 0) return null;

  return (
    <section id={`category-${category._id}`} className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
        {category.description && (
          <p className="text-gray-500 text-sm mt-1">{category.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {category.items.map((item) => (
          <MenuItemCard key={item._id} item={item} />
        ))}
      </div>
    </section>
  );
}
