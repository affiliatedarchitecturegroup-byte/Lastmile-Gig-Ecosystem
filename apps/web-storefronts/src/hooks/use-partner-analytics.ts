/**
 * Partner Analytics Hook
 * @module web-storefronts/hooks/use-partner-analytics
 * @description Custom hook for fetching and managing partner analytics data
 * @phase P198 - Storefront Partner Analytics Dashboard
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  DashboardPeriod,
  PartnerAnalytics,
  PeakHourEntry,
  PopularItemSummary,
  RevenueDataPoint,
} from '../types/partner.types';

const LMG_API_BASE = process.env.NEXT_PUBLIC_LMG_API_URL ?? '/api/v1';

/** Analytics state */
interface AnalyticsState {
  readonly analytics: PartnerAnalytics | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly period: DashboardPeriod;
  readonly selectedMetric: AnalyticsMetric;
}

/** Available analytics metrics for chart display */
export type AnalyticsMetric =
  | 'revenue'
  | 'orders'
  | 'average_order_value'
  | 'delivery_time'
  | 'customer_satisfaction';

/** Chart configuration for analytics display */
export interface ChartConfig {
  readonly type: 'line' | 'bar' | 'heatmap' | 'pie';
  readonly title: string;
  readonly yAxisLabel: string;
  readonly color: string;
  readonly data: ReadonlyArray<{ label: string; value: number }>;
}

/** Initial state */
const INITIAL_STATE: AnalyticsState = {
  analytics: null,
  isLoading: true,
  error: null,
  period: 'month',
  selectedMetric: 'revenue',
};

/**
 * Fetch analytics data from the storefront service
 */
async function fetchAnalytics(
  partnerId: string,
  period: DashboardPeriod,
  token: string,
): Promise<PartnerAnalytics> {
  const response = await fetch(
    `${LMG_API_BASE}/partners/${partnerId}/analytics?period=${period}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Analytics fetch failed: ${response.status}`);
  }

  const result: { data: PartnerAnalytics } = await response.json();
  return result.data;
}

/**
 * Transform revenue data into chart-compatible format
 */
export function buildRevenueChartConfig(
  data: ReadonlyArray<RevenueDataPoint>,
): ChartConfig {
  return {
    type: 'line',
    title: 'Revenue Over Time',
    yAxisLabel: 'Revenue (ZAR)',
    color: '#2563eb',
    data: data.map((point) => ({
      label: new Date(point.date).toLocaleDateString('en-ZA', {
        month: 'short',
        day: 'numeric',
      }),
      value: point.revenue,
    })),
  };
}

/**
 * Transform order count data into chart-compatible format
 */
export function buildOrdersChartConfig(
  data: ReadonlyArray<RevenueDataPoint>,
): ChartConfig {
  return {
    type: 'bar',
    title: 'Orders Over Time',
    yAxisLabel: 'Number of Orders',
    color: '#16a34a',
    data: data.map((point) => ({
      label: new Date(point.date).toLocaleDateString('en-ZA', {
        month: 'short',
        day: 'numeric',
      }),
      value: point.orderCount,
    })),
  };
}

/**
 * Build peak hours heatmap data
 */
export function buildPeakHoursData(
  peakHours: ReadonlyArray<PeakHourEntry>,
): ReadonlyArray<{ day: string; hour: number; intensity: number }> {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxCount = Math.max(...peakHours.map((entry) => entry.orderCount), 1);

  return peakHours.map((entry) => ({
    day: dayNames[entry.dayOfWeek] ?? 'Unknown',
    hour: entry.hour,
    intensity: entry.orderCount / maxCount,
  }));
}

/**
 * Build popular items chart data
 */
export function buildPopularItemsConfig(
  items: ReadonlyArray<PopularItemSummary>,
): ChartConfig {
  return {
    type: 'bar',
    title: 'Top Selling Items',
    yAxisLabel: 'Times Ordered',
    color: '#f59e0b',
    data: items.slice(0, 10).map((item) => ({
      label: item.name.length > 20 ? `${item.name.slice(0, 17)}...` : item.name,
      value: item.totalOrdered,
    })),
  };
}

/**
 * Custom hook for partner analytics data
 * Provides revenue charts, peak hours, popular items, and performance metrics
 *
 * @param partnerId - UUID of the partner restaurant
 * @param token - JWT bearer token for API authentication
 */
export function usePartnerAnalytics(
  partnerId: string,
  token: string,
): {
  readonly analytics: PartnerAnalytics | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly period: DashboardPeriod;
  readonly selectedMetric: AnalyticsMetric;
  readonly revenueChart: ChartConfig | null;
  readonly ordersChart: ChartConfig | null;
  readonly popularItemsChart: ChartConfig | null;
  readonly peakHoursData: ReadonlyArray<{
    day: string;
    hour: number;
    intensity: number;
  }>;
  readonly setPeriod: (period: DashboardPeriod) => void;
  readonly setMetric: (metric: AnalyticsMetric) => void;
  readonly refresh: () => Promise<void>;
} {
  const [state, setState] = useState<AnalyticsState>(INITIAL_STATE);

  const loadAnalytics = useCallback(
    async (selectedPeriod: DashboardPeriod): Promise<void> => {
      if (!partnerId || !token) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const analytics = await fetchAnalytics(partnerId, selectedPeriod, token);
        setState((prev) => ({ ...prev, analytics, isLoading: false }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load analytics';
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
      }
    },
    [partnerId, token],
  );

  const setPeriod = useCallback(
    (newPeriod: DashboardPeriod): void => {
      setState((prev) => ({ ...prev, period: newPeriod }));
      void loadAnalytics(newPeriod);
    },
    [loadAnalytics],
  );

  const setMetric = useCallback((metric: AnalyticsMetric): void => {
    setState((prev) => ({ ...prev, selectedMetric: metric }));
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await loadAnalytics(state.period);
  }, [loadAnalytics, state.period]);

  useEffect(() => {
    void loadAnalytics(state.period);
  }, [loadAnalytics, state.period]);

  const revenueChart = state.analytics
    ? buildRevenueChartConfig(state.analytics.revenueData)
    : null;

  const ordersChart = state.analytics
    ? buildOrdersChartConfig(state.analytics.revenueData)
    : null;

  const popularItemsChart = state.analytics
    ? buildPopularItemsConfig(state.analytics.popularItems)
    : null;

  const peakHoursData = state.analytics
    ? buildPeakHoursData(state.analytics.peakHours)
    : [];

  return {
    analytics: state.analytics,
    isLoading: state.isLoading,
    error: state.error,
    period: state.period,
    selectedMetric: state.selectedMetric,
    revenueChart,
    ordersChart,
    popularItemsChart,
    peakHoursData,
    setPeriod,
    setMetric,
    refresh,
  };
}
