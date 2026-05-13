/**
 * MenuItemCard Component - Individual menu item display.
 *
 * Shows item image (Cloudinary), name, description, price,
 * dietary flags, and an "Add to Cart" button.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts
 */

'use client';

import { useCartStore } from '../../store/cart-store';

interface MenuItem {
  _id: string;
  name: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  cloudinaryUrl: string | null;
  tags: string[];
  dietaryFlags: string[];
  isAvailable: boolean;
  isPopular: boolean;
  preparationTime: number;
}

export function MenuItemCard({ item }: { item: MenuItem }) {
  const addItem = useCartStore((state) => state.addItem);

  const displayPrice = item.discountPrice ?? item.price;
  const hasDiscount = item.discountPrice !== null && item.discountPrice < item.price;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${!item.isAvailable ? 'opacity-50' : ''}`}>
      <div className="flex">
        {/* Item Details */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              {item.isPopular && (
                <span className="text-xs text-orange-600 font-medium">Popular</span>
              )}
            </div>
          </div>

          {item.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}

          {/* Dietary Flags */}
          {item.dietaryFlags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {item.dietaryFlags.map((flag) => (
                <span key={flag} className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                  {flag.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Price + Add to Cart */}
          <div className="flex items-center justify-between mt-3">
            <div>
              <span className="font-bold text-gray-900">R{displayPrice.toFixed(2)}</span>
              {hasDiscount && (
                <span className="ml-2 text-sm text-gray-400 line-through">R{item.price.toFixed(2)}</span>
              )}
            </div>

            <button
              onClick={() =>
                addItem({
                  itemId: item._id,
                  name: item.name,
                  price: displayPrice,
                  quantity: 1,
                })
              }
              disabled={!item.isAvailable}
              className="px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {item.isAvailable ? 'Add' : 'Unavailable'}
            </button>
          </div>
        </div>

        {/* Item Image */}
        {item.cloudinaryUrl && (
          <div className="w-28 h-28 flex-shrink-0">
            <img
              src={item.cloudinaryUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  );
}
