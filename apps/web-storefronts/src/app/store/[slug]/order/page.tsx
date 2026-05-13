/**
 * Storefront Checkout Page (P191)
 *
 * Renders the checkout flow at /store/[slug]/order.
 *
 * @module web-storefronts/app/store/[slug]/order/page
 */

import React from 'react';

import { CheckoutFlow } from '@/components/storefront/checkout-flow';
import { fetchRestaurant } from '@/lib/api/storefront-api';

interface CheckoutPageProps {
  params: { slug: string };
}

export default async function CheckoutPage({
  params,
}: CheckoutPageProps): Promise<React.JSX.Element> {
  const restaurant = await fetchRestaurant(params.slug);

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Restaurant not found</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <CheckoutFlow
        restaurantSlug={params.slug}
        restaurantName={restaurant.name}
        items={[]}
        subtotal={0}
        deliveryFee={25}
        serviceFee={0}
      />
    </main>
  );
}
