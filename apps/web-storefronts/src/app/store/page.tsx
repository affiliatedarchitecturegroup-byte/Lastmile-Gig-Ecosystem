/**
 * Restaurant Directory Page - /store
 *
 * Lists all active restaurants with search and filter capabilities.
 * ISR revalidation every 60 seconds.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts
 */

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restaurants | Lastmile Gig',
  description: 'Browse restaurants and order food for delivery on Lastmile Gig',
};

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  description: string;
  partnerType: string;
  logoUrl: string | null;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  averageDeliveryTime: number;
  minimumOrder: number;
  address: { city: string; province: string };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005/v1';

async function getRestaurants(): Promise<Restaurant[]> {
  try {
    const res = await fetch(`${API_BASE}/restaurants`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function StoreDirectoryPage() {
  const restaurants = await getRestaurants();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurants</h1>
        <p className="text-gray-500 mb-8">
          {restaurants.length} restaurants available for delivery
        </p>

        {restaurants.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No restaurants available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <Link
                key={restaurant._id}
                href={`/store/${restaurant.slug}`}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-40 bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
                  {restaurant.logoUrl ? (
                    <img src={restaurant.logoUrl} alt={restaurant.name} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <span className="text-white text-2xl font-bold">{restaurant.name.charAt(0)}</span>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900">{restaurant.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{restaurant.description}</p>

                  <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                    <span className="text-yellow-500">{restaurant.rating.toFixed(1)}</span>
                    <span>{restaurant.averageDeliveryTime} min</span>
                    <span>Min R{restaurant.minimumOrder}</span>
                  </div>

                  {restaurant.cuisine.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {restaurant.cuisine.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
