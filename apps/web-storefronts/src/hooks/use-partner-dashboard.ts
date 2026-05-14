/**
 * Partner Dashboard Hook
 * @module web-storefronts/hooks/use-partner-dashboard
 * @description Custom hook for fetching and managing partner dashboard data
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  DashboardPeriod,
  DashboardQuickStats,
  RevenueSummary,
} from '../types/partner.types';

const LMG_API_BASE = process.env.NEXT_PUBLIC_LMG_API_URL ?? '/api/v1';

/** Dashboard state container */
interface DashboardState {
  readonly revenue: RevenueSummary | null;
  readonly quickStats: DashboardQuickStats | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly period: DashboardPeriod;
}

/** Initial dashboard state */
const INITIAL_STATE: DashboardState = {
  revenue: null,
  quickStats: null,
  isLoading: true,
  error: null,
  period: 'today',
};

/** Auto-refresh interval in milliseconds (30 seconds) */
const REFRESH_INTERVAL_MS = 30_000;

/**
 * Fetches revenue summary from the storefront service API
 * @param partnerId - UUID of the partner restaurant
 * @param period - Time period filter
 * @param token - JWT bearer token
 */
async function fetchRevenueSummary(
  partnerId: string,
  period: DashboardPeriod,
  token: string,
): Promise<RevenueSummary> {
  const response = await fetch(
    `${LMG_API_BASE}/partners/${partnerId}/revenue?period=${period}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Revenue fetch failed: ${response.status}`);
  }

  const result: { data: RevenueSummary } = await response.json();
  return result.data;
}

/**
 * Fetches quick stats from the storefront service API
 * @param partnerId - UUID of the partner restaurant
 * @param token - JWT bearer token
 */
async function fetchQuickStats(
  partnerId: string,
  token: string,
): Promise<DashboardQuickStats> {
  const response = await fetch(
    `${LMG_API_BASE}/partners/${partnerId}/stats`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Stats fetch failed: ${response.status}`);
  }

  const result: { data: DashboardQuickStats } = await response.json();
  return result.data;
}

/**
 * Custom hook for partner dashboard data management
 * Provides revenue summary, quick stats, period filtering, and auto-refresh
 *
 * @param partnerId - UUID of the partner restaurant
 * @param token - JWT bearer token for API authentication
 * @returns Dashboard state with loading/error states and actions
 */
export function usePartnerDashboard(
  partnerId: string,
  token: string,
): {
  readonly revenue: RevenueSummary | null;
  readonly quickStats: DashboardQuickStats | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly period: DashboardPeriod;
  readonly setPeriod: (period: DashboardPeriod) => void;
  readonly refresh: () => Promise<void>;
} {
  const [state, setState] = useState<DashboardState>(INITIAL_STATE);

  const loadDashboardData = useCallback(
    async (selectedPeriod: DashboardPeriod): Promise<void> => {
      if (!partnerId || !token) {
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const [revenue, quickStats] = await Promise.all([
          fetchRevenueSummary(partnerId, selectedPeriod, token),
          fetchQuickStats(partnerId, token),
        ]);

        setState((prev) => ({
          ...prev,
          revenue,
          quickStats,
          isLoading: false,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load dashboard data';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
      }
    },
    [partnerId, token],
  );

  const setPeriod = useCallback(
    (newPeriod: DashboardPeriod): void => {
      setState((prev) => ({ ...prev, period: newPeriod }));
      void loadDashboardData(newPeriod);
    },
    [loadDashboardData],
  );

  const refresh = useCallback(async (): Promise<void> => {
    await loadDashboardData(state.period);
  }, [loadDashboardData, state.period]);

  useEffect(() => {
    void loadDashboardData(state.period);
  }, [loadDashboardData, state.period]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadDashboardData(state.period);
    }, REFRESH_INTERVAL_MS);

    return (): void => {
      clearInterval(interval);
    };
  }, [loadDashboardData, state.period]);

  return {
    revenue: state.revenue,
    quickStats: state.quickStats,
    isLoading: state.isLoading,
    error: state.error,
    period: state.period,
    setPeriod,
    refresh,
  };
}
