/**
 * New Order Alert Component
 * @module web-storefronts/components/partner/orders/NewOrderAlert
 * @description Pop-up alert for new incoming orders with sound notification
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import type { PartnerOrder } from '../../../types/partner.types';

/** Props for NewOrderAlert */
interface NewOrderAlertProps {
  readonly order: PartnerOrder | null;
  readonly onDismiss: () => void;
  readonly onConfirm: (orderId: string) => Promise<void>;
}

/** Auto-dismiss timeout in milliseconds (30 seconds) */
const AUTO_DISMISS_MS = 30_000;

/** Format ZAR currency */
function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
}

/**
 * NewOrderAlert - Slide-in alert for new orders
 * Displays prominently when a new order arrives via WebSocket
 * Auto-dismisses after 30 seconds if no action is taken
 *
 * @param props.order - The new order to display, or null to hide
 * @param props.onDismiss - Callback to dismiss the alert
 * @param props.onConfirm - Callback to confirm/accept the order
 */
export function NewOrderAlert({
  order,
  onDismiss,
  onConfirm,
}: NewOrderAlertProps): React.ReactElement | null {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Set up auto-dismiss timer */
  useEffect(() => {
    if (order) {
      timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    }

    return (): void => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [order, onDismiss]);

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (!order) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    await onConfirm(order.id);
    onDismiss();
  }, [order, onConfirm, onDismiss]);

  const handleDismiss = useCallback((): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onDismiss();
  }, [onDismiss]);

  if (!order) {
    return null;
  }

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className="lmg-new-order-alert"
      role="alert"
      aria-live="assertive"
      aria-label={`New order ${order.orderNumber} received`}
    >
      <div className="lmg-new-order-alert__content">
        {/* Order header */}
        <div className="lmg-new-order-alert__header">
          <span className="lmg-new-order-alert__icon" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div className="lmg-new-order-alert__title-group">
            <h4 className="lmg-new-order-alert__title">New Order!</h4>
            <span className="lmg-new-order-alert__order-number">
              #{order.orderNumber}
            </span>
          </div>
          <button
            type="button"
            className="lmg-new-order-alert__close"
            onClick={handleDismiss}
            aria-label="Dismiss alert"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.207 4.793a1 1 0 010 1.414L9.414 9l2.793 2.793a1 1 0 01-1.414 1.414L8 10.414l-2.793 2.793a1 1 0 01-1.414-1.414L6.586 9 3.793 6.207a1 1 0 011.414-1.414L8 7.586l2.793-2.793a1 1 0 011.414 0z" />
            </svg>
          </button>
        </div>

        {/* Order summary */}
        <div className="lmg-new-order-alert__summary">
          <div className="lmg-new-order-alert__customer">
            <span className="lmg-new-order-alert__label">Customer</span>
            <span className="lmg-new-order-alert__value">
              {order.customer.displayName}
              {order.customer.isRepeatCustomer ? ' (Repeat)' : ''}
            </span>
          </div>
          <div className="lmg-new-order-alert__items">
            <span className="lmg-new-order-alert__label">Items</span>
            <span className="lmg-new-order-alert__value">
              {String(itemCount)} item{itemCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="lmg-new-order-alert__total">
            <span className="lmg-new-order-alert__label">Total</span>
            <span className="lmg-new-order-alert__value lmg-new-order-alert__value--highlight">
              {formatZAR(order.total)}
            </span>
          </div>
        </div>

        {/* Item list preview */}
        <ul className="lmg-new-order-alert__item-list">
          {order.items.map((item) => (
            <li key={item.id} className="lmg-new-order-alert__item">
              <span className="lmg-new-order-alert__item-qty">
                {String(item.quantity)}x
              </span>
              <span className="lmg-new-order-alert__item-name">
                {item.name}
              </span>
              <span className="lmg-new-order-alert__item-price">
                {formatZAR(item.totalPrice)}
              </span>
            </li>
          ))}
        </ul>

        {/* Action buttons */}
        <div className="lmg-new-order-alert__actions">
          <button
            type="button"
            className="lmg-btn lmg-btn--primary lmg-btn--lg lmg-btn--full-width"
            onClick={handleConfirm}
          >
            Accept Order
          </button>
          <button
            type="button"
            className="lmg-btn lmg-btn--ghost lmg-btn--sm"
            onClick={handleDismiss}
          >
            Review Later
          </button>
        </div>
      </div>
    </div>
  );
}
