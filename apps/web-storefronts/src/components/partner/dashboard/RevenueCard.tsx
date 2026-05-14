/**
 * Revenue Card Component
 * @module web-storefronts/components/partner/dashboard/RevenueCard
 * @description Displays revenue summary with trend indicators for partner dashboard
 */

'use client';

import React from 'react';

import type { RevenueSummary } from '../../../types/partner.types';

/** Props for RevenueCard component */
interface RevenueCardProps {
  readonly revenue: RevenueSummary | null;
  readonly isLoading: boolean;
}

/** Format ZAR currency amount */
function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Get trend indicator class and symbol */
function getTrendIndicator(percentChange: number): {
  symbol: string;
  colorClass: string;
  label: string;
} {
  if (percentChange > 0) {
    return {
      symbol: '+',
      colorClass: 'lmg-trend-up',
      label: `Up ${percentChange.toFixed(1)}%`,
    };
  }
  if (percentChange < 0) {
    return {
      symbol: '',
      colorClass: 'lmg-trend-down',
      label: `Down ${Math.abs(percentChange).toFixed(1)}%`,
    };
  }
  return {
    symbol: '',
    colorClass: 'lmg-trend-neutral',
    label: 'No change',
  };
}

/**
 * RevenueCard - Revenue summary card for partner dashboard
 * Shows today's revenue with comparison to yesterday and weekly totals
 *
 * @param props.revenue - Revenue summary data
 * @param props.isLoading - Loading state flag
 */
export function RevenueCard({
  revenue,
  isLoading,
}: RevenueCardProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="lmg-card lmg-card--revenue lmg-card--loading">
        <div className="lmg-card__header">
          <h3 className="lmg-card__title">Revenue Overview</h3>
        </div>
        <div className="lmg-card__body">
          <div className="lmg-skeleton lmg-skeleton--lg" />
          <div className="lmg-skeleton lmg-skeleton--sm" />
          <div className="lmg-skeleton lmg-skeleton--sm" />
        </div>
      </div>
    );
  }

  if (!revenue) {
    return (
      <div className="lmg-card lmg-card--revenue lmg-card--empty">
        <div className="lmg-card__header">
          <h3 className="lmg-card__title">Revenue Overview</h3>
        </div>
        <div className="lmg-card__body">
          <p className="lmg-card__empty-text">No revenue data available</p>
        </div>
      </div>
    );
  }

  const todayTrend = getTrendIndicator(revenue.percentChangeToday);
  const weekTrend = getTrendIndicator(revenue.percentChangeWeek);

  return (
    <div className="lmg-card lmg-card--revenue">
      <div className="lmg-card__header">
        <h3 className="lmg-card__title">Revenue Overview</h3>
        <span className="lmg-badge lmg-badge--live">Live</span>
      </div>

      <div className="lmg-card__body">
        {/* Today's Revenue - Primary metric */}
        <div className="lmg-revenue__primary">
          <span className="lmg-revenue__label">Today</span>
          <span className="lmg-revenue__amount lmg-revenue__amount--lg">
            {formatZAR(revenue.todayRevenue)}
          </span>
          <span
            className={`lmg-revenue__trend ${todayTrend.colorClass}`}
            aria-label={todayTrend.label}
          >
            {todayTrend.symbol}
            {revenue.percentChangeToday.toFixed(1)}% vs yesterday
          </span>
        </div>

        {/* Secondary metrics grid */}
        <div className="lmg-revenue__grid">
          <div className="lmg-revenue__metric">
            <span className="lmg-revenue__label">Yesterday</span>
            <span className="lmg-revenue__amount">
              {formatZAR(revenue.yesterdayRevenue)}
            </span>
          </div>

          <div className="lmg-revenue__metric">
            <span className="lmg-revenue__label">This Week</span>
            <span className="lmg-revenue__amount">
              {formatZAR(revenue.weekRevenue)}
            </span>
            <span
              className={`lmg-revenue__trend ${weekTrend.colorClass}`}
              aria-label={weekTrend.label}
            >
              {weekTrend.symbol}
              {revenue.percentChangeWeek.toFixed(1)}%
            </span>
          </div>

          <div className="lmg-revenue__metric">
            <span className="lmg-revenue__label">This Month</span>
            <span className="lmg-revenue__amount">
              {formatZAR(revenue.monthRevenue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
