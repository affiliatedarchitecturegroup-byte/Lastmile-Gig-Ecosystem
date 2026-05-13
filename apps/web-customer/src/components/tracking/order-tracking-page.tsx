/**
 * Customer Order Tracking Page (P171)
 *
 * Full-page order tracking view at /store/[slug]/order/[id]/track
 *
 * Displays:
 * - Live tracking map with driver position
 * - Order timeline (status history)
 * - Order details summary
 * - Contact driver button
 * - Delivery confirmation
 *
 * @module web-customer/components/tracking/order-tracking-page
 * @language TypeScript (Next.js 14)
 */

'use client';

import React, { useMemo, useState } from 'react';

import { LiveTrackingMap, OrderStatus } from './live-tracking-map';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderDetails {
  id: string;
  restaurantName: string;
  restaurantSlug: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: {
    lat: number;
    lng: number;
    formattedAddress: string;
  };
  restaurantLocation: {
    lat: number;
    lng: number;
    name: string;
  };
  placedAt: string;
  estimatedDeliveryAt: string | null;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface StatusEvent {
  status: OrderStatus;
  timestamp: string;
  message?: string;
}

export interface OrderTrackingPageProps {
  order: OrderDetails;
  token: string;
  wsUrl?: string;
}

// ---------------------------------------------------------------------------
// Status timeline configuration
// ---------------------------------------------------------------------------

const STATUS_STEPS: OrderStatus[] = [
  'placed',
  'confirmed',
  'preparing',
  'dispatched',
  'picked_up',
  'en_route',
  'delivered',
];

const STATUS_ICONS: Record<OrderStatus, string> = {
  placed: 'clipboard-check',
  confirmed: 'check-circle',
  preparing: 'fire',
  dispatched: 'user-plus',
  picked_up: 'shopping-bag',
  en_route: 'truck',
  delivered: 'home',
  cancelled: 'x-circle',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderTrackingPage({
  order,
  token,
  wsUrl,
}: OrderTrackingPageProps): React.JSX.Element {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('placed');
  const [statusHistory, setStatusHistory] = useState<StatusEvent[]>([
    { status: 'placed', timestamp: order.placedAt },
  ]);
  const [isDelivered, setIsDelivered] = useState(false);

  // Track completed status index for timeline
  const currentStepIndex = useMemo(
    () => STATUS_STEPS.indexOf(currentStatus),
    [currentStatus]
  );

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  const handleStatusChange = (status: OrderStatus): void => {
    setCurrentStatus(status);
    setStatusHistory((prev) => [
      ...prev,
      { status, timestamp: new Date().toISOString() },
    ]);
  };

  const handleDeliveryConfirmed = (): void => {
    setIsDelivered(true);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Track Your Order
            </h1>
            <p className="text-sm text-gray-500">
              {order.restaurantName} - Order #{order.id.slice(0, 8)}
            </p>
          </div>
          <span className="text-xs text-gray-400 font-mono">{order.id}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Live tracking map */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-[400px]">
            <LiveTrackingMap
              orderId={order.id}
              token={token}
              deliveryAddress={order.deliveryAddress}
              restaurantLocation={order.restaurantLocation}
              wsUrl={wsUrl}
              onStatusChange={handleStatusChange}
              onDeliveryConfirmed={handleDeliveryConfirmed}
            />
          </div>
        </section>

        {/* Status timeline */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Order Progress
          </h2>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const historyEntry = statusHistory.find(
                (e) => e.status === step
              );

              return (
                <div key={step} className="flex items-start gap-4">
                  {/* Timeline dot and line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        isCompleted
                          ? 'bg-green-500 border-green-500'
                          : isCurrent
                            ? 'bg-blue-500 border-blue-500 animate-pulse'
                            : 'bg-white border-gray-300'
                      }`}
                    />
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>

                  {/* Status label */}
                  <div className="pb-6">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted || isCurrent
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    {historyEntry && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(historyEntry.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Order summary */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Order Summary
          </h2>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div
                key={index}
                className="flex justify-between text-sm text-gray-700"
              >
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <hr className="my-2" />
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>R{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery fee</span>
              <span>R{order.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>R{order.total.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Delivery address */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Delivering to
          </h2>
          <p className="text-sm text-gray-600">
            {order.deliveryAddress.formattedAddress}
          </p>
        </section>

        {/* Delivered confirmation */}
        {isDelivered && (
          <section className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <h2 className="text-lg font-bold text-green-800">
              Order Delivered!
            </h2>
            <p className="text-sm text-green-600 mt-1">
              Your order has been successfully delivered. Enjoy your meal!
            </p>
            <button
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg
                         hover:bg-green-700 transition-colors text-sm font-medium"
              onClick={() => {
                // Navigate to rating page
              }}
            >
              Rate Your Experience
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

export default OrderTrackingPage;
