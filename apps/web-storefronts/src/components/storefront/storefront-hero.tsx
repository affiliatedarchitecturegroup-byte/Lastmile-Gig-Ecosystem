/**
 * StorefrontHero Component (P187)
 *
 * Restaurant hero banner displayed at the top of the storefront page.
 * Shows cover image, logo, name, cuisine tags, rating, delivery time,
 * minimum order amount, and open/closed status.
 *
 * @module web-storefronts/components/storefront/storefront-hero
 * @language TypeScript (Next.js 14)
 */

'use client';

import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CloudinaryAsset {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
}

interface RestaurantAddress {
  street: string;
  suburb: string;
  city: string;
  province: string;
}

export interface StorefrontHeroProps {
  name: string;
  coverImage: CloudinaryAsset | null;
  logo: CloudinaryAsset | null;
  cuisine: string[];
  rating: number;
  avgDeliveryTime: number;
  minimumOrder: number;
  isOpen: boolean;
  address?: RestaurantAddress;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StorefrontHero({
  name,
  coverImage,
  logo,
  cuisine,
  rating,
  avgDeliveryTime,
  minimumOrder,
  isOpen,
  address,
}: StorefrontHeroProps): React.JSX.Element {
  const coverUrl = coverImage?.secureUrl || '/images/default-cover.jpg';
  const logoUrl = logo?.secureUrl || '/images/default-logo.png';

  return (
    <section className="relative">
      {/* Cover image */}
      <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
        <img
          src={coverUrl}
          alt={`${name} cover`}
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Restaurant info overlay */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-20 flex items-end gap-4 pb-6">
          {/* Logo */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-4 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Name and details */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                {name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isOpen
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {isOpen ? 'Open' : 'Closed'}
              </span>
            </div>

            {/* Cuisine tags */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {cuisine.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
                >
                  {c.replace('-', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}
                </span>
              ))}
            </div>

            {/* Address */}
            {address && (
              <p className="text-sm text-gray-500 mt-1 truncate">
                {address.suburb}, {address.city}
              </p>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 border-t border-gray-200 pt-4 pb-2 text-sm">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="font-semibold text-gray-900">
              {rating > 0 ? rating.toFixed(1) : 'New'}
            </span>
          </div>

          {/* Delivery time */}
          <div className="flex items-center gap-1 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{avgDeliveryTime} min</span>
          </div>

          {/* Minimum order */}
          <div className="flex items-center gap-1 text-gray-600">
            <span>Min R{minimumOrder.toFixed(0)}</span>
          </div>

          {/* Delivery fee indicator */}
          <div className="flex items-center gap-1 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Delivery</span>
          </div>
        </div>
      </div>
    </section>
  );
}
