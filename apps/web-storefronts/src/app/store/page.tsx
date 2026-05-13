/**
 * Partner Directory Page (P194)
 *
 * Restaurant directory at /store with search, cuisine filters,
 * and featured restaurants.
 *
 * @module web-storefronts/app/store/page
 */

import React from 'react';
import { Metadata } from 'next';

import { fetchFeaturedRestaurants, fetchRestaurants } from '@/lib/api/storefront-api';

export const metadata: Metadata = {
  title: 'Browse Restaurants - Lastmile Gig',
  description:
    'Order food from the best restaurants in South Africa. Fast delivery on Lastmile Gig.',
};

export const revalidate = 60;

interface DirectoryPageProps {
  searchParams: { cuisine?: string; city?: string; search?: string; page?: string };
}

export default async function PartnerDirectoryPage({
  searchParams,
}: DirectoryPageProps): Promise<React.JSX.Element> {
  const [featured, restaurants] = await Promise.all([
    fetchFeaturedRestaurants(),
    fetchRestaurants({
      page: searchParams.page ? parseInt(searchParams.page, 10) : 1,
      limit: 20,
      cuisine: searchParams.cuisine,
      city: searchParams.city,
      search: searchParams.search,
    }),
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-green-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Order from your favourite restaurants
          </h1>
          <p className="text-green-100 text-lg mb-8">
            Fast, reliable delivery across South Africa
          </p>

          {/* Search bar */}
          <form
            action="/store"
            method="GET"
            className="max-w-xl mx-auto flex"
          >
            <input
              type="text"
              name="search"
              defaultValue={searchParams.search}
              placeholder="Search restaurants or dishes..."
              className="flex-1 px-4 py-3 rounded-l-lg text-gray-900 text-sm focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-green-800 rounded-r-lg hover:bg-green-900 transition-colors font-medium"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured restaurants */}
        {featured.length > 0 && !searchParams.search && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((r) => (
                <a
                  key={r.id}
                  href={`/store/${r.slug}`}
                  className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-gray-100">
                    {r.coverImage && (
                      <img
                        src={r.coverImage.secureUrl}
                        alt={r.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{r.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {r.cuisine?.slice(0, 3).join(' / ')}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <span>{r.rating > 0 ? `${r.rating.toFixed(1)} stars` : 'New'}</span>
                      <span>{r.avgDeliveryTime} min</span>
                      <span>Min R{r.minimumOrder}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* All restaurants */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {searchParams.search
              ? `Results for "${searchParams.search}"`
              : 'All Restaurants'}
          </h2>

          {restaurants.data.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No restaurants found.</p>
              <a href="/store" className="text-green-600 mt-2 inline-block hover:underline">
                Clear filters
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.data.map((r) => (
                <a
                  key={r.id}
                  href={`/store/${r.slug}`}
                  className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-gray-100">
                    {r.coverImage && (
                      <img
                        src={r.coverImage.secureUrl}
                        alt={r.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{r.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{r.description?.slice(0, 80)}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <span>{r.rating > 0 ? `${r.rating.toFixed(1)} stars` : 'New'}</span>
                      <span>{r.avgDeliveryTime} min</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {restaurants.meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: restaurants.meta.totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <a
                    key={pageNum}
                    href={`/store?page=${pageNum}${searchParams.cuisine ? `&cuisine=${searchParams.cuisine}` : ''}${searchParams.search ? `&search=${searchParams.search}` : ''}`}
                    className={`px-3 py-1 rounded text-sm ${
                      pageNum === restaurants.meta.page
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </a>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
