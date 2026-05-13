/**
 * MenuCategoryNav Component - Sticky category navigation bar.
 *
 * Horizontal scrollable category tabs that stick to the top of the
 * viewport when scrolling. Clicking a tab scrolls to that category section.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts
 */

'use client';

import { useState, useEffect } from 'react';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export function MenuCategoryNav({ categories }: { categories: Category[] }) {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?._id ?? '');

  useEffect(() => {
    const handleScroll = (): void => {
      for (const cat of categories) {
        const element = document.getElementById(`category-${cat._id}`);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom > 120) {
            setActiveCategory(cat._id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const scrollToCategory = (categoryId: string): void => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const offset = 100;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveCategory(categoryId);
    }
  };

  return (
    <nav className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category._id}
              onClick={() => scrollToCategory(category._id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === category._id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
