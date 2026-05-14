/**
 * Revenue Chart Component
 * @module web-storefronts/components/partner/analytics/RevenueChart
 * @description Line/bar chart for revenue and order trends using Chart.js
 * @phase P198 - Storefront Partner Analytics Dashboard
 */

'use client';

import React, { useEffect, useRef } from 'react';

import type { ChartConfig } from '../../../hooks/use-partner-analytics';

/** Props for RevenueChart */
interface RevenueChartProps {
  readonly config: ChartConfig | null;
  readonly isLoading: boolean;
  readonly height?: number;
}

/** Format ZAR value for chart tooltip */
function formatChartValue(value: number, isRevenue: boolean): string {
  if (isRevenue) {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(value);
  }
  return String(value);
}

/**
 * Draw a simple canvas-based chart (no external dependency for SSR safety)
 * In production, this would use Chart.js - this provides a canvas fallback
 */
function drawChart(
  canvas: HTMLCanvasElement,
  config: ChartConfig,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { data, color, type } = config;
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (data.length === 0) return;

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue || 1;

  // Draw grid lines
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Y-axis labels
    const gridValue = maxValue - (valueRange / gridLines) * i;
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      formatChartValue(Math.round(gridValue), config.title.includes('Revenue')),
      padding.left - 8,
      y + 4,
    );
  }

  if (type === 'bar') {
    // Bar chart
    const barWidth = chartWidth / data.length * 0.7;
    const gap = chartWidth / data.length * 0.3;

    data.forEach((point, index) => {
      const x = padding.left + (chartWidth / data.length) * index + gap / 2;
      const barHeight = ((point.value - minValue) / valueRange) * chartHeight;
      const y = padding.top + chartHeight - barHeight;

      // Bar
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.globalAlpha = 1;

      // X-axis label
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        point.label,
        x + barWidth / 2,
        height - padding.bottom + 16,
      );
    });
  } else {
    // Line chart
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    data.forEach((point, index) => {
      const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
      const y =
        padding.top +
        chartHeight -
        ((point.value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Area fill under line
    const lastPoint = data[data.length - 1];
    if (lastPoint) {
      const lastX =
        padding.left + (chartWidth / (data.length - 1 || 1)) * (data.length - 1);
      ctx.lineTo(lastX, padding.top + chartHeight);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.1;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Data points
    data.forEach((point, index) => {
      const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
      const y =
        padding.top +
        chartHeight -
        ((point.value - minValue) / valueRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // X-axis labels (show every other label if too many)
      if (data.length <= 15 || index % 2 === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(point.label, x, height - padding.bottom + 16);
      }
    });
  }
}

/**
 * RevenueChart - Canvas-based chart for revenue/order visualization
 * Uses native Canvas API with Chart.js-compatible config structure
 * Supports line and bar chart types
 */
export function RevenueChart({
  config,
  isLoading,
  height = 300,
}: RevenueChartProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!config || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    drawChart(canvas, config);
  }, [config]);

  if (isLoading) {
    return (
      <div className="lmg-chart lmg-chart--loading" style={{ height }}>
        <div className="lmg-skeleton lmg-skeleton--chart" />
      </div>
    );
  }

  if (!config || config.data.length === 0) {
    return (
      <div className="lmg-chart lmg-chart--empty" style={{ height }}>
        <p className="lmg-chart__empty-text">No data available for this period</p>
      </div>
    );
  }

  return (
    <div className="lmg-chart">
      <h4 className="lmg-chart__title">{config.title}</h4>
      <div className="lmg-chart__canvas-wrapper" style={{ height }}>
        <canvas
          ref={canvasRef}
          className="lmg-chart__canvas"
          style={{ width: '100%', height: '100%' }}
          aria-label={config.title}
          role="img"
        />
      </div>
    </div>
  );
}
