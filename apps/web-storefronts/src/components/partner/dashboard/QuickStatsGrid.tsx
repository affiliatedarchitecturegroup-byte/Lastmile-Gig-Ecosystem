/**
 * Quick Stats Grid Component
 * @module web-storefronts/components/partner/dashboard/QuickStatsGrid
 * @description Grid of key performance indicators for partner dashboard
 */

'use client';

import React from 'react';

import type { DashboardQuickStats } from '../../../types/partner.types';

/** Props for QuickStatsGrid component */
interface QuickStatsGridProps {
  readonly stats: DashboardQuickStats | null;
  readonly isLoading: boolean;
}

/** Single stat card configuration */
interface StatCardConfig {
  readonly label: string;
  readonly value: string;
  readonly subtitle?: string;
  readonly icon: string;
  readonly colorClass: string;
}

/** Format number with locale awareness */
function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Format minutes as human-readable duration */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours}h ${remainingMinutes}m`;
}

/** Build stat cards from quick stats data */
function buildStatCards(stats: DashboardQuickStats): ReadonlyArray<StatCardConfig> {
  const orderChange =
    stats.totalOrdersYesterday > 0
      ? (
          ((stats.totalOrdersToday - stats.totalOrdersYesterday) /
            stats.totalOrdersYesterday) *
          100
        ).toFixed(1)
      : 'N/A';

  return [
    {
      label: 'Orders Today',
      value: formatNumber(stats.totalOrdersToday),
      subtitle:
        orderChange !== 'N/A'
          ? `${Number(orderChange) >= 0 ? '+' : ''}${orderChange}% vs yesterday`
          : `${formatNumber(stats.totalOrdersYesterday)} yesterday`,
      icon: 'shopping-bag',
      colorClass: 'lmg-stat--orders',
    },
    {
      label: 'Average Order Value',
      value: `R${formatNumber(stats.averageOrderValue, 2)}`,
      subtitle: 'Per order',
      icon: 'trending-up',
      colorClass: 'lmg-stat--aov',
    },
    {
      label: 'Avg Prep Time',
      value: formatDuration(stats.averagePrepTime),
      subtitle: 'Kitchen to ready',
      icon: 'clock',
      colorClass: 'lmg-stat--prep',
    },
    {
      label: 'Active Deliveries',
      value: formatNumber(stats.activeDeliveries),
      subtitle: `${formatNumber(stats.pendingOrders)} pending`,
      icon: 'truck',
      colorClass: 'lmg-stat--active',
    },
    {
      label: 'Cancelled Today',
      value: formatNumber(stats.cancelledToday),
      subtitle: stats.totalOrdersToday > 0
        ? `${((stats.cancelledToday / stats.totalOrdersToday) * 100).toFixed(1)}% rate`
        : 'No orders yet',
      icon: 'x-circle',
      colorClass: stats.cancelledToday > 0 ? 'lmg-stat--warning' : 'lmg-stat--success',
    },
    {
      label: 'Customer Rating',
      value: stats.customerRating.toFixed(1),
      subtitle: `${formatNumber(stats.ratingCount)} reviews`,
      icon: 'star',
      colorClass: 'lmg-stat--rating',
    },
  ];
}

/**
 * QuickStatsGrid - Grid of KPI cards for partner dashboard
 * Displays key metrics: orders, AOV, prep time, active deliveries, cancellations, rating
 *
 * @param props.stats - Quick stats data
 * @param props.isLoading - Loading state flag
 */
export function QuickStatsGrid({
  stats,
  isLoading,
}: QuickStatsGridProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="lmg-stats-grid" role="status" aria-label="Loading statistics">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`skeleton-${String(index)}`}
            className="lmg-stat-card lmg-stat-card--loading"
          >
            <div className="lmg-skeleton lmg-skeleton--icon" />
            <div className="lmg-skeleton lmg-skeleton--text" />
            <div className="lmg-skeleton lmg-skeleton--text-sm" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="lmg-stats-grid lmg-stats-grid--empty">
        <p className="lmg-stats-grid__empty-text">
          No statistics available. Start accepting orders to see your dashboard metrics.
        </p>
      </div>
    );
  }

  const cards = buildStatCards(stats);

  return (
    <div className="lmg-stats-grid" role="region" aria-label="Dashboard statistics">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`lmg-stat-card ${card.colorClass}`}
        >
          <div className="lmg-stat-card__icon">
            <span className={`lmg-icon lmg-icon--${card.icon}`} aria-hidden="true" />
          </div>
          <div className="lmg-stat-card__content">
            <span className="lmg-stat-card__label">{card.label}</span>
            <span className="lmg-stat-card__value">{card.value}</span>
            {card.subtitle ? (
              <span className="lmg-stat-card__subtitle">{card.subtitle}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
