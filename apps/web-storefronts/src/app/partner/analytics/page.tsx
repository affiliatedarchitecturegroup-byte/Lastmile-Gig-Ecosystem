/**
 * Partner Analytics Page
 * @module web-storefronts/app/partner/analytics/page
 * @description Comprehensive analytics dashboard with charts, heatmaps, and rankings
 * @phase P198 - Storefront Partner Analytics Dashboard
 */

'use client';

import React from 'react';

import { PeakHoursHeatmap } from '../../../components/partner/analytics/PeakHoursHeatmap';
import { PopularItemsList } from '../../../components/partner/analytics/PopularItemsList';
import { RevenueChart } from '../../../components/partner/analytics/RevenueChart';
import { usePartnerAnalytics } from '../../../hooks/use-partner-analytics';
import type { DashboardPeriod } from '../../../types/partner.types';

/** Period filter options */
const PERIOD_OPTIONS: ReadonlyArray<{
  value: DashboardPeriod;
  label: string;
}> = [
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'quarter', label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
];

/** Format ZAR */
function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Format percentage */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Format duration in minutes */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
}

/**
 * PartnerAnalyticsPage - Full analytics dashboard for restaurant partners
 *
 * Features:
 * - Revenue trend chart (line chart)
 * - Order volume chart (bar chart)
 * - Peak hours heatmap (7-day x 24-hour)
 * - Popular items ranked list
 * - Summary KPI cards (revenue, AOV, delivery time, satisfaction, retention, cancellation)
 * - Period filtering and CSV export
 *
 * Route: /partner/analytics
 */
export default function PartnerAnalyticsPage(): React.ReactElement {
  // TODO: Replace with actual auth context
  const partnerId = 'placeholder-partner-id';
  const token = 'placeholder-token';

  const {
    analytics,
    isLoading,
    error,
    period,
    revenueChart,
    ordersChart,
    peakHoursData,
    setPeriod,
    refresh,
  } = usePartnerAnalytics(partnerId, token);

  /** Handle CSV export */
  const handleExport = (): void => {
    if (!analytics) return;

    const csvRows: string[] = [
      'Date,Revenue (ZAR),Orders',
      ...analytics.revenueData.map(
        (point) => `${point.date},${String(point.revenue)},${String(point.orderCount)}`,
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="lmg-analytics-page">
      {/* Header */}
      <header className="lmg-analytics-page__header">
        <div className="lmg-analytics-page__title-group">
          <h1 className="lmg-analytics-page__title">Analytics</h1>
          <p className="lmg-analytics-page__subtitle">
            Track your restaurant performance and identify growth opportunities
          </p>
        </div>

        <div className="lmg-analytics-page__controls">
          {/* Period filter */}
          <div className="lmg-period-filter" role="tablist">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={period === option.value}
                className={`lmg-period-filter__btn ${
                  period === option.value ? 'lmg-period-filter__btn--active' : ''
                }`}
                onClick={(): void => setPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Export button */}
          <button
            type="button"
            className="lmg-btn lmg-btn--outline lmg-btn--sm"
            onClick={handleExport}
            disabled={!analytics || isLoading}
          >
            Export CSV
          </button>

          {/* Refresh */}
          <button
            type="button"
            className="lmg-btn lmg-btn--outline lmg-btn--sm"
            onClick={refresh}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Error */}
      {error ? (
        <div className="lmg-alert lmg-alert--error" role="alert">
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

      {/* KPI Summary Cards */}
      {analytics ? (
        <div className="lmg-analytics-page__kpi-grid">
          <div className="lmg-kpi-card">
            <span className="lmg-kpi-card__label">Total Revenue</span>
            <span className="lmg-kpi-card__value">
              {formatZAR(analytics.totalRevenue)}
            </span>
          </div>
          <div className="lmg-kpi-card">
            <span className="lmg-kpi-card__label">Total Orders</span>
            <span className="lmg-kpi-card__value">
              {String(analytics.totalOrders)}
            </span>
          </div>
          <div className="lmg-kpi-card">
            <span className="lmg-kpi-card__label">Avg Order Value</span>
            <span className="lmg-kpi-card__value">
              {formatZAR(analytics.averageOrderValue)}
            </span>
          </div>
          <div className="lmg-kpi-card">
            <span className="lmg-kpi-card__label">Avg Delivery Time</span>
            <span className="lmg-kpi-card__value">
              {formatDuration(analytics.averageDeliveryTime)}
            </span>
          </div>
          <div className="lmg-kpi-card">
            <span className="lmg-kpi-card__label">Customer Satisfaction</span>
            <span className="lmg-kpi-card__value">
              {analytics.customerSatisfaction.toFixed(1)}/5.0
            </span>
          </div>
          <div className="lmg-kpi-card">
            <span className="lmg-kpi-card__label">Return Customer Rate</span>
            <span className="lmg-kpi-card__value">
              {formatPercent(analytics.returnCustomerRate)}
            </span>
          </div>
        </div>
      ) : null}

      {/* Charts grid */}
      <div className="lmg-analytics-page__charts">
        {/* Revenue chart */}
        <section
          className="lmg-analytics-page__chart-section"
          aria-label="Revenue chart"
        >
          <RevenueChart config={revenueChart} isLoading={isLoading} height={350} />
        </section>

        {/* Orders chart */}
        <section
          className="lmg-analytics-page__chart-section"
          aria-label="Orders chart"
        >
          <RevenueChart config={ordersChart} isLoading={isLoading} height={350} />
        </section>
      </div>

      {/* Bottom grid: Heatmap + Popular Items */}
      <div className="lmg-analytics-page__bottom-grid">
        {/* Peak hours heatmap */}
        <section
          className="lmg-analytics-page__section"
          aria-label="Peak hours heatmap"
        >
          <PeakHoursHeatmap data={peakHoursData} isLoading={isLoading} />
        </section>

        {/* Popular items */}
        <section
          className="lmg-analytics-page__section"
          aria-label="Popular items"
        >
          <PopularItemsList
            items={analytics?.popularItems ?? []}
            isLoading={isLoading}
          />
        </section>
      </div>
    </div>
  );
}
