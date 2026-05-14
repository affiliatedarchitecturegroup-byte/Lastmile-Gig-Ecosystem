/**
 * Peak Hours Heatmap Component
 * @module web-storefronts/components/partner/analytics/PeakHoursHeatmap
 * @description 7-day x 24-hour heatmap showing order density by time
 * @phase P198 - Storefront Partner Analytics Dashboard
 */

'use client';

import React, { useMemo } from 'react';

/** Props for PeakHoursHeatmap */
interface PeakHoursHeatmapProps {
  readonly data: ReadonlyArray<{
    day: string;
    hour: number;
    intensity: number;
  }>;
  readonly isLoading: boolean;
}

/** Day labels for Y-axis */
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Hours to show labels for (every 3 hours) */
const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21];

/** Format hour for display */
function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour < 12) return `${String(hour)}am`;
  if (hour === 12) return '12pm';
  return `${String(hour - 12)}pm`;
}

/** Get color for intensity value (0.0 to 1.0) */
function getHeatmapColor(intensity: number): string {
  if (intensity === 0) return '#f3f4f6';
  if (intensity < 0.2) return '#dbeafe';
  if (intensity < 0.4) return '#93c5fd';
  if (intensity < 0.6) return '#3b82f6';
  if (intensity < 0.8) return '#1d4ed8';
  return '#1e3a8a';
}

/** Get text color for contrast against background */
function getTextColor(intensity: number): string {
  return intensity > 0.5 ? '#ffffff' : '#374151';
}

/**
 * Build a 7x24 grid from sparse data
 */
function buildGrid(
  data: ReadonlyArray<{ day: string; hour: number; intensity: number }>,
): ReadonlyArray<ReadonlyArray<number>> {
  const grid: number[][] = DAY_LABELS.map(() =>
    Array.from({ length: 24 }, () => 0),
  );

  for (const entry of data) {
    const dayIndex = DAY_LABELS.indexOf(entry.day);
    if (dayIndex >= 0 && entry.hour >= 0 && entry.hour < 24) {
      grid[dayIndex][entry.hour] = entry.intensity;
    }
  }

  return grid;
}

/**
 * PeakHoursHeatmap - Visual heatmap showing order volume by day and hour
 * Helps partners identify their busiest periods for staffing decisions
 */
export function PeakHoursHeatmap({
  data,
  isLoading,
}: PeakHoursHeatmapProps): React.ReactElement {
  const grid = useMemo(() => buildGrid(data), [data]);

  if (isLoading) {
    return (
      <div className="lmg-heatmap lmg-heatmap--loading">
        <h4 className="lmg-heatmap__title">Peak Hours</h4>
        <div className="lmg-skeleton lmg-skeleton--heatmap" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="lmg-heatmap lmg-heatmap--empty">
        <h4 className="lmg-heatmap__title">Peak Hours</h4>
        <p className="lmg-heatmap__empty-text">
          Not enough data to show peak hours. Check back after a week of orders.
        </p>
      </div>
    );
  }

  return (
    <div className="lmg-heatmap" role="img" aria-label="Peak hours heatmap">
      <h4 className="lmg-heatmap__title">Peak Hours (Last 7 Days)</h4>

      <div className="lmg-heatmap__container">
        {/* Hour labels header */}
        <div className="lmg-heatmap__header">
          <div className="lmg-heatmap__corner" />
          {HOUR_LABELS.map((hour) => (
            <div
              key={`hour-${String(hour)}`}
              className="lmg-heatmap__hour-label"
              style={{ gridColumn: `span 3` }}
            >
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {grid.map((row, dayIndex) => (
          <div key={DAY_LABELS[dayIndex]} className="lmg-heatmap__row">
            <div className="lmg-heatmap__day-label">
              {DAY_LABELS[dayIndex]}
            </div>
            {row.map((intensity, hour) => (
              <div
                key={`${String(dayIndex)}-${String(hour)}`}
                className="lmg-heatmap__cell"
                style={{
                  backgroundColor: getHeatmapColor(intensity),
                  color: getTextColor(intensity),
                }}
                title={`${DAY_LABELS[dayIndex]} ${formatHour(hour)}: ${Math.round(intensity * 100)}% of peak`}
                aria-label={`${DAY_LABELS[dayIndex]} ${formatHour(hour)}: ${Math.round(intensity * 100)}% activity`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="lmg-heatmap__legend">
        <span className="lmg-heatmap__legend-label">Low</span>
        <div className="lmg-heatmap__legend-gradient">
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
            <div
              key={String(intensity)}
              className="lmg-heatmap__legend-swatch"
              style={{ backgroundColor: getHeatmapColor(intensity) }}
            />
          ))}
        </div>
        <span className="lmg-heatmap__legend-label">High</span>
      </div>
    </div>
  );
}
