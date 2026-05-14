/**
 * Popular Items List Component
 * @module web-storefronts/components/partner/analytics/PopularItemsList
 * @description Ranked list of top-selling menu items with trend indicators
 * @phase P198 - Storefront Partner Analytics Dashboard
 */

'use client';

import React from 'react';

import type { PopularItemSummary } from '../../../types/partner.types';

/** Props for PopularItemsList */
interface PopularItemsListProps {
  readonly items: ReadonlyArray<PopularItemSummary>;
  readonly isLoading: boolean;
  readonly maxItems?: number;
}

/** Format ZAR currency */
function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Get trend indicator */
function getTrendConfig(trend: 'up' | 'down' | 'stable'): {
  icon: string;
  colorClass: string;
  label: string;
} {
  switch (trend) {
    case 'up':
      return { icon: 'arrow-up', colorClass: 'lmg-trend--up', label: 'Trending up' };
    case 'down':
      return { icon: 'arrow-down', colorClass: 'lmg-trend--down', label: 'Trending down' };
    case 'stable':
    default:
      return { icon: 'minus', colorClass: 'lmg-trend--stable', label: 'Stable' };
  }
}

/**
 * PopularItemsList - Ranked list of top-selling menu items
 * Shows order count, revenue contribution, and trend direction
 */
export function PopularItemsList({
  items,
  isLoading,
  maxItems = 10,
}: PopularItemsListProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="lmg-popular-items lmg-popular-items--loading">
        <h4 className="lmg-popular-items__title">Popular Items</h4>
        <ul className="lmg-popular-items__list">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={`skeleton-${String(i)}`}
              className="lmg-popular-items__item lmg-popular-items__item--loading"
            >
              <div className="lmg-skeleton lmg-skeleton--text" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="lmg-popular-items lmg-popular-items--empty">
        <h4 className="lmg-popular-items__title">Popular Items</h4>
        <p className="lmg-popular-items__empty-text">
          No order data available yet. Popular items will appear here once customers start ordering.
        </p>
      </div>
    );
  }

  const displayItems = items.slice(0, maxItems);

  return (
    <div className="lmg-popular-items">
      <h4 className="lmg-popular-items__title">
        Popular Items
        <span className="lmg-popular-items__count">
          Top {String(displayItems.length)}
        </span>
      </h4>

      <ol className="lmg-popular-items__list">
        {displayItems.map((item, index) => {
          const trend = getTrendConfig(item.trend);
          return (
            <li key={item.menuItemId} className="lmg-popular-items__item">
              {/* Rank badge */}
              <span className="lmg-popular-items__rank">
                {String(index + 1)}
              </span>

              {/* Item details */}
              <div className="lmg-popular-items__details">
                <span className="lmg-popular-items__name">{item.name}</span>
                <div className="lmg-popular-items__meta">
                  <span className="lmg-popular-items__orders">
                    {String(item.totalOrdered)} orders
                  </span>
                  <span className="lmg-popular-items__separator" aria-hidden="true">
                    |
                  </span>
                  <span className="lmg-popular-items__percent">
                    {item.percentOfOrders.toFixed(1)}% of all orders
                  </span>
                </div>
              </div>

              {/* Revenue */}
              <span className="lmg-popular-items__revenue">
                {formatZAR(item.totalRevenue)}
              </span>

              {/* Trend indicator */}
              <span
                className={`lmg-popular-items__trend ${trend.colorClass}`}
                aria-label={trend.label}
              >
                <span
                  className={`lmg-icon lmg-icon--${trend.icon}`}
                  aria-hidden="true"
                />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
