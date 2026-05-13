/**
 * StorefrontHero Component - Restaurant hero banner.
 *
 * Displays the restaurant hero image, logo, name, cuisine tags,
 * rating, delivery time, and current opening status.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts
 */

'use client';

interface Restaurant {
  name: string;
  description: string;
  heroImageUrl: string | null;
  logoUrl: string | null;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  averageDeliveryTime: number;
  minimumOrder: number;
  address: { street: string; city: string; province: string };
  operatingHours: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
}

function isCurrentlyOpen(hours: Restaurant['operatingHours']): boolean {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todayHours = hours.find((h) => h.day === today);
  if (!todayHours || todayHours.isClosed) return false;

  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '\u2605'.repeat(full) + (half ? '\u00BD' : '') + '\u2606'.repeat(empty);
}

export function StorefrontHero({ restaurant }: { restaurant: Restaurant }) {
  const isOpen = isCurrentlyOpen(restaurant.operatingHours);

  return (
    <section className="relative">
      {/* Hero Image */}
      <div className="h-64 md:h-80 bg-gray-200 relative overflow-hidden">
        {restaurant.heroImageUrl ? (
          <img
            src={restaurant.heroImageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">{restaurant.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Restaurant Info */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col md:flex-row items-start gap-4">
          {/* Logo */}
          {restaurant.logoUrl && (
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md flex-shrink-0">
              <img src={restaurant.logoUrl} alt={`${restaurant.name} logo`} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{restaurant.name}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isOpen ? 'Open Now' : 'Closed'}
              </span>
            </div>

            {restaurant.description && (
              <p className="text-gray-600 mt-1">{restaurant.description}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
              <span className="text-yellow-500">{renderStars(restaurant.rating)} ({restaurant.reviewCount})</span>
              <span>{restaurant.averageDeliveryTime} min delivery</span>
              <span>Min order R{restaurant.minimumOrder}</span>
              <span>{restaurant.address.city}, {restaurant.address.province}</span>
            </div>

            {restaurant.cuisine.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {restaurant.cuisine.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
