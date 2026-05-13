/**
 * MenuItemCard Component (P189)
 *
 * Individual menu item card displaying food photo, name, description,
 * price, dietary badges, and an "Add to Cart" button.
 *
 * Images loaded from Cloudinary with lazy loading and WebP optimization.
 *
 * @module web-storefronts/components/storefront/menu-item-card
 */

'use client';

import React, { useState } from 'react';

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

export interface MenuItemCardProps {
  item: MenuItemData;
  restaurantSlug: string;
}

// ---------------------------------------------------------------------------
// Dietary badge config
// ---------------------------------------------------------------------------

const DIETARY_BADGES: Array<{
  key: keyof Pick<MenuItemData, 'isVegetarian' | 'isVegan' | 'isHalal' | 'isSpicy'>;
  label: string;
  color: string;
}> = [
  { key: 'isVegetarian', label: 'Vegetarian', color: 'bg-green-100 text-green-700' },
  { key: 'isVegan', label: 'Vegan', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'isHalal', label: 'Halal', color: 'bg-blue-100 text-blue-700' },
  { key: 'isSpicy', label: 'Spicy', color: 'bg-red-100 text-red-700' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuItemCard({
  item,
  restaurantSlug,
}: MenuItemCardProps): React.JSX.Element {
  const [imageLoaded, setImageLoaded] = useState(false);

  const primaryImage = item.images[0];
  const activeBadges = DIETARY_BADGES.filter((badge) => item[badge.key]);

  // Build Cloudinary optimized URL (WebP, auto quality, responsive)
  const imageUrl = primaryImage
    ? `${primaryImage.secureUrl}?w=400&h=300&fit=crop&auto=format,compress&q=80`
    : '/images/food-placeholder.jpg';

  const handleAddToCart = (): void => {
    // Dispatch to cart store (Zustand)
    // If item has required options, open option selector modal first
    const hasRequiredOptions = item.options.some((opt) => opt.required);

    if (hasRequiredOptions) {
      // Open options modal - handled by parent/store
      window.dispatchEvent(
        new CustomEvent('lmg:open-item-options', {
          detail: { itemId: item.id, restaurantSlug },
        }),
      );
    } else {
      window.dispatchEvent(
        new CustomEvent('lmg:add-to-cart', {
          detail: {
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            selectedOptions: [],
            specialInstructions: null,
          },
        }),
      );
    }
  };

  return (
    <article
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
      data-testid={`menu-item-${item.id}`}
    >
      {/* Food image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={item.name}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105 transition-transform ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {/* Spice level indicator */}
        {item.isSpicy && item.spiceLevel && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {'🌶️'.repeat(Math.min(item.spiceLevel, 5))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Dietary badges */}
        {activeBadges.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {activeBadges.map((badge) => (
              <span
                key={badge.key}
                className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Name and description */}
        <h3 className="font-semibold text-gray-900 text-base leading-tight">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Allergens */}
        {item.allergens.length > 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Allergens: {item.allergens.join(', ')}
          </p>
        )}

        {/* Price and add to cart */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div>
            <span className="text-lg font-bold text-gray-900">
              R{item.price.toFixed(2)}
            </span>
            {item.preparationTime > 0 && (
              <span className="text-xs text-gray-400 ml-2">
                {item.preparationTime} min
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!item.isAvailable}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg
                       hover:bg-green-700 active:bg-green-800 transition-colors
                       disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {item.isAvailable ? 'Add' : 'Sold out'}
          </button>
        </div>
      </div>
    </article>
  );
}
