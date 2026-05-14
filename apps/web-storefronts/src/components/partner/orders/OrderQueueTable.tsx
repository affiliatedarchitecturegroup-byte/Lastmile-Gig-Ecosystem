/**
 * Order Queue Table Component
 * @module web-storefronts/components/partner/orders/OrderQueueTable
 * @description Real-time order queue table for partner restaurant operations
 */

'use client';

import React, { useCallback, useMemo } from 'react';

import type {
  PartnerOrder,
  PartnerOrderStatus,
} from '../../../types/partner.types';

/** Props for OrderQueueTable */
interface OrderQueueTableProps {
  readonly orders: ReadonlyArray<PartnerOrder>;
  readonly isLoading: boolean;
  readonly isConnected: boolean;
  readonly onConfirmOrder: (orderId: string) => Promise<void>;
  readonly onMarkReady: (orderId: string) => Promise<void>;
  readonly onUpdateStatus: (
    orderId: string,
    status: PartnerOrderStatus,
  ) => Promise<void>;
}

/** Status badge configuration */
const STATUS_CONFIG: Record<
  string,
  { label: string; colorClass: string; priority: number }
> = {
  PENDING: { label: 'New', colorClass: 'lmg-status--pending', priority: 1 },
  CONFIRMED: {
    label: 'Confirmed',
    colorClass: 'lmg-status--confirmed',
    priority: 2,
  },
  PREPARING: {
    label: 'Preparing',
    colorClass: 'lmg-status--preparing',
    priority: 3,
  },
  READY_FOR_PICKUP: {
    label: 'Ready',
    colorClass: 'lmg-status--ready',
    priority: 4,
  },
  PICKED_UP: {
    label: 'Picked Up',
    colorClass: 'lmg-status--picked-up',
    priority: 5,
  },
  DELIVERING: {
    label: 'Delivering',
    colorClass: 'lmg-status--delivering',
    priority: 6,
  },
  DELIVERED: {
    label: 'Delivered',
    colorClass: 'lmg-status--delivered',
    priority: 7,
  },
  CANCELLED: {
    label: 'Cancelled',
    colorClass: 'lmg-status--cancelled',
    priority: 8,
  },
  REFUNDED: {
    label: 'Refunded',
    colorClass: 'lmg-status--refunded',
    priority: 9,
  },
};

/** Format ZAR currency */
function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
}

/** Format relative time (e.g., "5 min ago") */
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${String(diffMinutes)} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${String(diffHours)}h ago`;

  return date.toLocaleDateString('en-ZA');
}

/** Calculate time elapsed since order creation in minutes */
function getElapsedMinutes(createdAt: string): number {
  return Math.floor(
    (new Date().getTime() - new Date(createdAt).getTime()) / 60_000,
  );
}

/** Get urgency class based on elapsed time */
function getUrgencyClass(createdAt: string, status: string): string {
  if (status === 'DELIVERED' || status === 'CANCELLED' || status === 'REFUNDED') {
    return '';
  }
  const elapsed = getElapsedMinutes(createdAt);
  if (elapsed > 30) return 'lmg-order--critical';
  if (elapsed > 15) return 'lmg-order--urgent';
  if (elapsed > 10) return 'lmg-order--warning';
  return '';
}

/**
 * Single order row component
 */
function OrderRow({
  order,
  onConfirmOrder,
  onMarkReady,
}: {
  readonly order: PartnerOrder;
  readonly onConfirmOrder: (orderId: string) => Promise<void>;
  readonly onMarkReady: (orderId: string) => Promise<void>;
}): React.ReactElement {
  const statusConfig = STATUS_CONFIG[order.status] ?? {
    label: order.status,
    colorClass: 'lmg-status--unknown',
    priority: 99,
  };

  const urgencyClass = getUrgencyClass(order.createdAt, order.status);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleConfirm = useCallback(async (): Promise<void> => {
    await onConfirmOrder(order.id);
  }, [order.id, onConfirmOrder]);

  const handleMarkReady = useCallback(async (): Promise<void> => {
    await onMarkReady(order.id);
  }, [order.id, onMarkReady]);

  return (
    <tr className={`lmg-order-row ${urgencyClass}`}>
      {/* Order Number */}
      <td className="lmg-order-row__cell lmg-order-row__cell--number">
        <span className="lmg-order-row__number">#{order.orderNumber}</span>
        <span className="lmg-order-row__time">
          {formatRelativeTime(order.createdAt)}
        </span>
      </td>

      {/* Customer */}
      <td className="lmg-order-row__cell lmg-order-row__cell--customer">
        <span className="lmg-order-row__customer-name">
          {order.customer.displayName}
        </span>
        {order.customer.isRepeatCustomer ? (
          <span className="lmg-badge lmg-badge--repeat" title="Repeat customer">
            Repeat
          </span>
        ) : null}
      </td>

      {/* Items Summary */}
      <td className="lmg-order-row__cell lmg-order-row__cell--items">
        <span className="lmg-order-row__item-count">
          {String(itemCount)} item{itemCount !== 1 ? 's' : ''}
        </span>
        <ul className="lmg-order-row__item-list">
          {order.items.slice(0, 3).map((item) => (
            <li key={item.id} className="lmg-order-row__item">
              {String(item.quantity)}x {item.name}
            </li>
          ))}
          {order.items.length > 3 ? (
            <li className="lmg-order-row__item lmg-order-row__item--more">
              +{String(order.items.length - 3)} more
            </li>
          ) : null}
        </ul>
        {order.specialInstructions ? (
          <span
            className="lmg-order-row__instructions"
            title={order.specialInstructions}
          >
            Note: {order.specialInstructions}
          </span>
        ) : null}
      </td>

      {/* Total */}
      <td className="lmg-order-row__cell lmg-order-row__cell--total">
        <span className="lmg-order-row__total">{formatZAR(order.total)}</span>
      </td>

      {/* Status */}
      <td className="lmg-order-row__cell lmg-order-row__cell--status">
        <span className={`lmg-status-badge ${statusConfig.colorClass}`}>
          {statusConfig.label}
        </span>
      </td>

      {/* Driver */}
      <td className="lmg-order-row__cell lmg-order-row__cell--driver">
        {order.driverAssigned ? (
          <span className="lmg-order-row__driver">{order.driverName}</span>
        ) : (
          <span className="lmg-order-row__driver lmg-order-row__driver--pending">
            Awaiting driver
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="lmg-order-row__cell lmg-order-row__cell--actions">
        {order.status === 'PENDING' ? (
          <button
            type="button"
            className="lmg-btn lmg-btn--primary lmg-btn--sm"
            onClick={handleConfirm}
          >
            Accept
          </button>
        ) : null}
        {order.status === 'CONFIRMED' || order.status === 'PREPARING' ? (
          <button
            type="button"
            className="lmg-btn lmg-btn--success lmg-btn--sm"
            onClick={handleMarkReady}
          >
            Mark Ready
          </button>
        ) : null}
      </td>
    </tr>
  );
}

/**
 * OrderQueueTable - Real-time order queue with status management
 * Displays active orders in a table with action buttons for status transitions
 *
 * Features:
 * - Color-coded urgency indicators based on elapsed time
 * - One-click order confirmation and ready marking
 * - Real-time connection status indicator
 * - Responsive layout for tablet and desktop
 */
export function OrderQueueTable({
  orders,
  isLoading,
  isConnected,
  onConfirmOrder,
  onMarkReady,
}: OrderQueueTableProps): React.ReactElement {
  /** Count orders by status for summary bar */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of orders) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  if (isLoading) {
    return (
      <div className="lmg-order-queue lmg-order-queue--loading">
        <div className="lmg-order-queue__header">
          <h3 className="lmg-order-queue__title">Live Order Queue</h3>
        </div>
        <div className="lmg-order-queue__body">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`skeleton-${String(i)}`}
              className="lmg-skeleton lmg-skeleton--row"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="lmg-order-queue">
      {/* Header with connection status */}
      <div className="lmg-order-queue__header">
        <h3 className="lmg-order-queue__title">
          Live Order Queue
          <span className="lmg-order-queue__count">
            ({String(orders.length)})
          </span>
        </h3>
        <div className="lmg-order-queue__status-bar">
          <span
            className={`lmg-connection-indicator ${
              isConnected
                ? 'lmg-connection-indicator--connected'
                : 'lmg-connection-indicator--disconnected'
            }`}
          >
            {isConnected ? 'Live' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Status summary pills */}
      <div className="lmg-order-queue__summary">
        {Object.entries(statusCounts).map(([status, count]) => {
          const config = STATUS_CONFIG[status];
          return config ? (
            <span
              key={status}
              className={`lmg-status-pill ${config.colorClass}`}
            >
              {config.label}: {String(count)}
            </span>
          ) : null;
        })}
      </div>

      {/* Orders table */}
      {orders.length === 0 ? (
        <div className="lmg-order-queue__empty">
          <p>No active orders at the moment. New orders will appear here in real-time.</p>
        </div>
      ) : (
        <div className="lmg-order-queue__table-wrapper">
          <table className="lmg-order-queue__table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col">Driver</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onConfirmOrder={onConfirmOrder}
                  onMarkReady={onMarkReady}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
