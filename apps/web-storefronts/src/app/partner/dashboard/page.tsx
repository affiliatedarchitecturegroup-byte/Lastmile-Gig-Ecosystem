/**
 * Partner Dashboard Page
 * @module web-storefronts/app/partner/dashboard/page
 * @description Main partner admin dashboard with revenue overview and quick stats
 * @phase P196 - Storefront Partner Admin Dashboard
 */

'use client';

import React from 'react';

import { QuickStatsGrid } from '../../../components/partner/dashboard/QuickStatsGrid';
import { RevenueCard } from '../../../components/partner/dashboard/RevenueCard';
import { usePartnerDashboard } from '../../../hooks/use-partner-dashboard';
import type { DashboardPeriod } from '../../../types/partner.types';

/** Period filter options */
const PERIOD_OPTIONS: ReadonlyArray<{
  value: DashboardPeriod;
  label: string;
}> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
];

/**
 * PartnerDashboardPage - Main dashboard view for restaurant partners
 *
 * Features:
 * - Revenue overview with trend indicators
 * - Quick stats grid (orders, AOV, prep time, active deliveries, rating)
 * - Period filtering (today/week/month/quarter/year)
 * - Auto-refresh every 30 seconds
 * - Error handling with retry capability
 *
 * Authentication: Requires valid partner JWT token
 * Route: /partner/dashboard
 */
export default function PartnerDashboardPage(): React.ReactElement {
  // TODO: Replace with actual auth context from Auth0/session
  const partnerId = 'placeholder-partner-id';
  const token = 'placeholder-token';

  const {
    revenue,
    quickStats,
    isLoading,
    error,
    period,
    setPeriod,
    refresh,
  } = usePartnerDashboard(partnerId, token);

  return (
    <div className="lmg-dashboard-page">
      {/* Page header */}
      <header className="lmg-dashboard-page__header">
        <div className="lmg-dashboard-page__title-group">
          <h1 className="lmg-dashboard-page__title">Dashboard</h1>
          <p className="lmg-dashboard-page__subtitle">
            Real-time overview of your restaurant performance
          </p>
        </div>

        <div className="lmg-dashboard-page__controls">
          {/* Period filter */}
          <div className="lmg-period-filter" role="tablist" aria-label="Time period">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={period === option.value}
                className={`lmg-period-filter__btn ${
                  period === option.value
                    ? 'lmg-period-filter__btn--active'
                    : ''
                }`}
                onClick={(): void => setPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            className="lmg-btn lmg-btn--outline lmg-btn--sm"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh dashboard data"
          >
            <span
              className={`lmg-icon lmg-icon--refresh ${
                isLoading ? 'lmg-icon--spin' : ''
              }`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error ? (
        <div className="lmg-alert lmg-alert--error" role="alert">
          <span className="lmg-alert__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <span className="lmg-alert__message">{error}</span>
          <button
            type="button"
            className="lmg-btn lmg-btn--sm lmg-btn--outline"
            onClick={refresh}
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Dashboard content grid */}
      <div className="lmg-dashboard-page__content">
        {/* Revenue overview card */}
        <section
          className="lmg-dashboard-page__section lmg-dashboard-page__section--revenue"
          aria-label="Revenue overview"
        >
          <RevenueCard revenue={revenue} isLoading={isLoading} />
        </section>

        {/* Quick stats grid */}
        <section
          className="lmg-dashboard-page__section lmg-dashboard-page__section--stats"
          aria-label="Key performance indicators"
        >
          <QuickStatsGrid stats={quickStats} isLoading={isLoading} />
        </section>
      </div>

      {/* Dashboard footer */}
      <footer className="lmg-dashboard-page__footer">
        <p className="lmg-dashboard-page__refresh-note">
          Data refreshes automatically every 30 seconds
        </p>
      </footer>
    </div>
  );
}
