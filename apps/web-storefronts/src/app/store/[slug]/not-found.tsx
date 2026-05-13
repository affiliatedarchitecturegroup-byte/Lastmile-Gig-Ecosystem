/**
 * Storefront 404 Page (P186)
 *
 * Displayed when a restaurant slug doesn't match any active restaurant.
 *
 * @module web-storefronts/app/store/[slug]/not-found
 */

import React from 'react';

export default function StorefrontNotFound(): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Restaurant Not Found
        </h2>
        <p className="text-gray-500 mb-8">
          The restaurant you&apos;re looking for doesn&apos;t exist or may have
          been removed from the platform.
        </p>
        <a
          href="/store"
          className="inline-flex items-center px-6 py-3 bg-green-600 text-white
                     rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Browse All Restaurants
        </a>
      </div>
    </div>
  );
}
