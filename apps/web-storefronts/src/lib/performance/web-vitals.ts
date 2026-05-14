/**
 * Web Vitals Monitoring
 * @module web-storefronts/lib/performance/web-vitals
 * @description Core Web Vitals tracking for Lighthouse performance targets
 * @phase P204 - Storefront Performance Optimisation
 *
 * Target: Lighthouse >= 90 on all storefront pages
 */

/** Web Vitals metric types */
export type WebVitalMetric = 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';

/** Web Vitals thresholds (Good / Needs Improvement / Poor) */
export const WEB_VITALS_THRESHOLDS: Record<
  WebVitalMetric,
  { good: number; poor: number; unit: string }
> = {
  CLS: { good: 0.1, poor: 0.25, unit: '' },
  FCP: { good: 1800, poor: 3000, unit: 'ms' },
  FID: { good: 100, poor: 300, unit: 'ms' },
  INP: { good: 200, poor: 500, unit: 'ms' },
  LCP: { good: 2500, poor: 4000, unit: 'ms' },
  TTFB: { good: 800, poor: 1800, unit: 'ms' },
};

/** Metric event payload */
export interface WebVitalEvent {
  readonly name: WebVitalMetric;
  readonly value: number;
  readonly rating: 'good' | 'needs-improvement' | 'poor';
  readonly delta: number;
  readonly id: string;
  readonly navigationType: string;
  readonly url: string;
  readonly timestamp: number;
}

/**
 * Rate a metric value against thresholds
 */
function rateMetric(
  name: WebVitalMetric,
  value: number,
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = WEB_VITALS_THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report Web Vitals to analytics endpoint
 * Sends metrics to the analytics service for monitoring
 */
async function reportToAnalytics(metric: WebVitalEvent): Promise<void> {
  const analyticsUrl = '/api/v1/analytics/web-vitals';

  try {
    // Use sendBeacon for non-blocking reporting
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(metric)], {
        type: 'application/json',
      });
      navigator.sendBeacon(analyticsUrl, blob);
      return;
    }

    // Fallback to fetch with keepalive
    await fetch(analyticsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      keepalive: true,
    });
  } catch {
    // Silently fail - vitals reporting should not break the app
  }
}

/**
 * Create a Web Vitals reporter callback
 * Compatible with the web-vitals library's onCLS, onLCP, etc.
 *
 * Usage:
 *   import { onCLS, onLCP, onFID } from 'web-vitals';
 *   onCLS(createVitalsReporter('CLS'));
 *   onLCP(createVitalsReporter('LCP'));
 */
export function createVitalsReporter(
  metricName: WebVitalMetric,
): (metric: { value: number; delta: number; id: string; navigationType: string }) => void {
  return (metric): void => {
    const event: WebVitalEvent = {
      name: metricName,
      value: metric.value,
      rating: rateMetric(metricName, metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: Date.now(),
    };

    void reportToAnalytics(event);

    // Log poor metrics in development
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV === 'development' &&
      event.rating === 'poor'
    ) {
      const threshold = WEB_VITALS_THRESHOLDS[metricName];
      // eslint-disable-next-line no-console
      console.warn(
        `[Web Vitals] Poor ${metricName}: ${String(metric.value)}${threshold.unit} ` +
          `(threshold: ${String(threshold.good)}${threshold.unit})`,
      );
    }
  };
}

/**
 * Initialize all Web Vitals reporters
 * Call this in the root layout or _app.tsx
 *
 * Usage in Next.js App Router:
 *   'use client';
 *   useEffect(() => { initWebVitals(); }, []);
 */
export async function initWebVitals(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Dynamic import to keep bundle size small
    const { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } = await import(
      'web-vitals'
    );

    onCLS(createVitalsReporter('CLS'));
    onFCP(createVitalsReporter('FCP'));
    onFID(createVitalsReporter('FID'));
    onINP(createVitalsReporter('INP'));
    onLCP(createVitalsReporter('LCP'));
    onTTFB(createVitalsReporter('TTFB'));
  } catch {
    // web-vitals library not available, skip
  }
}

/**
 * Performance budget configuration
 * Used by CI to fail builds that exceed budgets
 */
export const PERFORMANCE_BUDGETS = {
  /** Maximum JavaScript bundle size (gzipped, in KB) */
  maxJsBundleSize: 200,
  /** Maximum CSS bundle size (gzipped, in KB) */
  maxCssBundleSize: 50,
  /** Maximum total page weight (in KB) */
  maxTotalPageWeight: 500,
  /** Maximum number of HTTP requests */
  maxRequests: 25,
  /** Minimum Lighthouse performance score */
  minLighthouseScore: 90,
  /** Maximum Time to First Byte (ms) */
  maxTTFB: 800,
  /** Maximum Largest Contentful Paint (ms) */
  maxLCP: 2500,
  /** Maximum First Input Delay (ms) */
  maxFID: 100,
  /** Maximum Cumulative Layout Shift */
  maxCLS: 0.1,
} as const;
