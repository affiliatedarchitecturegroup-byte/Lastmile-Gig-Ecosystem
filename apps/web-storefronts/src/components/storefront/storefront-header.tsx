/**
 * StorefrontHeader Component (P186)
 *
 * Top navigation header for the storefront page.
 * Includes back navigation, search, and cart indicator.
 *
 * @module web-storefronts/components/storefront/storefront-header
 */

'use client';

import React from 'react';

interface StorefrontHeaderProps {
  slug: string;
}

export function StorefrontHeader({ slug }: StorefrontHeaderProps): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Back to directory */}
          <a
            href="/store"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">All Restaurants</span>
          </a>

          {/* Logo */}
          <a href="/" className="text-lg font-bold text-green-600">
            Lastmile Gig
          </a>

          {/* Cart button */}
          <button
            className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Open cart"
            data-testid="cart-button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
