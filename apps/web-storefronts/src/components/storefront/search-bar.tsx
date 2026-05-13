/**
 * SearchBar Component (P195)
 *
 * Instant search bar that queries OpenSearch via the storefront API.
 * Displays results in a dropdown with restaurant name, item name, and price.
 *
 * @module web-storefronts/components/storefront/search-bar
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  price: number;
  restaurantName: string;
  restaurantSlug: string;
  imageUrl: string | null;
}

export interface SearchBarProps {
  placeholder?: string;
  apiUrl?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchBar({
  placeholder = 'Search for dishes or restaurants...',
  apiUrl = '/api/search',
}: SearchBarProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const handleSearch = useCallback(
    (searchQuery: string): void => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (searchQuery.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const response = await fetch(
            `${apiUrl}?q=${encodeURIComponent(searchQuery)}`,
          );
          if (response.ok) {
            const data = (await response.json()) as SearchResult[];
            setResults(data);
            setIsOpen(data.length > 0);
          }
        } catch {
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    },
    [apiUrl],
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((result) => (
            <a
              key={result.id}
              href={`/store/${result.restaurantSlug}`}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              {result.imageUrl && (
                <img
                  src={result.imageUrl}
                  alt={result.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {result.name}
                </p>
                <p className="text-xs text-gray-500">{result.restaurantName}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                R{result.price.toFixed(2)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
