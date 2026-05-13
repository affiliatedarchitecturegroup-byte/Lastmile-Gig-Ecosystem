/**
 * MenuCategoryNav Component (P188)
 *
 * Sticky horizontal scrollable category navigation bar.
 * Highlights the active category based on scroll position.
 * Clicking a category smoothly scrolls to that section.
 *
 * @module web-storefronts/components/storefront/menu-category-nav
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryData {
  id: string;
  name: string;
  slug: string;
}

export interface MenuCategoryNavProps {
  categories: CategoryData[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuCategoryNav({
  categories,
}: MenuCategoryNavProps): React.JSX.Element {
  const [activeSlug, setActiveSlug] = useState<string>(
    categories[0]?.slug || '',
  );
  const navRef = useRef<HTMLDivElement>(null);

  // Scroll to category section on click
  const handleCategoryClick = useCallback((slug: string): void => {
    setActiveSlug(slug);
    const element = document.getElementById(`category-${slug}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Track scroll position to highlight active category
  useEffect(() => {
    const handleScroll = (): void => {
      const scrollPosition = window.scrollY + 200;

      for (let i = categories.length - 1; i >= 0; i--) {
        const element = document.getElementById(
          `category-${categories[i].slug}`,
        );
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSlug(categories[i].slug);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  // Auto-scroll nav to keep active tab visible
  useEffect(() => {
    if (!navRef.current) return;
    const activeTab = navRef.current.querySelector(`[data-slug="${activeSlug}"]`);
    if (activeTab) {
      (activeTab as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeSlug]);

  if (categories.length === 0) return <></>;

  return (
    <nav
      ref={navRef}
      className="sticky top-14 z-30 bg-white border-b border-gray-200 shadow-sm"
      aria-label="Menu categories"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3 -mx-4 px-4">
          {categories.map((category) => (
            <button
              key={category.id}
              data-slug={category.slug}
              onClick={() => handleCategoryClick(category.slug)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeSlug === category.slug
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-current={activeSlug === category.slug ? 'true' : undefined}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
