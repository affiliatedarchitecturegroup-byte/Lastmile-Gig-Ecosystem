/**
 * CheckoutFlow Component (P191)
 *
 * Multi-step checkout flow: Cart Review -> Address -> Payment -> Confirmation.
 * Renders at /store/[slug]/order.
 *
 * Steps:
 * 1. Cart review with special instructions
 * 2. Delivery address input/selection
 * 3. Payment method selection (Paystack popup)
 * 4. Order confirmation with tracking link
 *
 * @module web-storefronts/components/storefront/checkout-flow
 */

'use client';

import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckoutStep = 'review' | 'address' | 'payment' | 'confirmation';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions: Array<{
    optionName: string;
    choiceLabel: string;
    priceAdjustment: number;
  }>;
}

interface DeliveryAddress {
  formattedAddress: string;
  lat: number;
  lng: number;
}

export interface CheckoutFlowProps {
  restaurantSlug: string;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
}

const STEPS: CheckoutStep[] = ['review', 'address', 'payment', 'confirmation'];
const STEP_LABELS: Record<CheckoutStep, string> = {
  review: 'Review',
  address: 'Address',
  payment: 'Payment',
  confirmation: 'Confirmed',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CheckoutFlow({
  restaurantSlug,
  restaurantName,
  items,
  subtotal,
  deliveryFee,
  serviceFee,
}: CheckoutFlowProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const total = subtotal + deliveryFee + serviceFee;
  const currentStepIndex = STEPS.indexOf(currentStep);

  const goToNext = (): void => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goToPrev = (): void => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handlePayment = async (): Promise<void> => {
    setIsProcessing(true);
    try {
      // In production: Call Paystack inline popup
      // After payment success: POST to /v1/restaurants/{slug}/orders
      // Placeholder: simulate order placement
      const fakeOrderId = `order-${Date.now()}`;
      setOrderId(fakeOrderId);
      setCurrentStep('confirmation');
    } catch {
      // Payment failed
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStepIndex
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentStepIndex ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`text-sm hidden sm:inline ${
                index <= currentStepIndex ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}>
                {STEP_LABELS[step]}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                index < currentStepIndex ? 'bg-green-600' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      {currentStep === 'review' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Review Your Order</h2>
          <p className="text-sm text-gray-500">From {restaurantName}</p>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between py-2 border-b border-gray-100">
                <div>
                  <span className="text-sm font-medium">{item.quantity}x {item.name}</span>
                  {item.selectedOptions.length > 0 && (
                    <p className="text-xs text-gray-400">
                      {item.selectedOptions.map((o) => o.choiceLabel).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium">R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special instructions? (optional)"
            className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none h-20"
            maxLength={500}
          />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>R{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Delivery fee</span><span>R{deliveryFee.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Service fee</span><span>R{serviceFee.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span><span>R{total.toFixed(2)}</span>
            </div>
          </div>

          <button onClick={goToNext} className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
            Continue to Address
          </button>
        </div>
      )}

      {currentStep === 'address' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Delivery Address</h2>

          <input
            type="text"
            placeholder="Enter your delivery address"
            className="w-full p-3 border border-gray-200 rounded-lg text-sm"
            onChange={(e) =>
              setDeliveryAddress({
                formattedAddress: e.target.value,
                lat: -29.8587,
                lng: 31.0218,
              })
            }
          />
          <p className="text-xs text-gray-400">
            We will use your location to calculate delivery fees and estimated time.
          </p>

          <div className="flex gap-3">
            <button onClick={goToPrev} className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-50">
              Back
            </button>
            <button
              onClick={goToNext}
              disabled={!deliveryAddress}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      )}

      {currentStep === 'payment' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Payment</h2>
          <p className="text-sm text-gray-500">Total: R{total.toFixed(2)}</p>

          <div className="space-y-3">
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              {isProcessing ? 'Processing...' : 'Pay with Paystack'}
            </button>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full py-4 border-2 border-green-600 text-green-600 rounded-lg font-medium hover:bg-green-50"
            >
              Pay with Ozow (Instant EFT)
            </button>
          </div>

          <button onClick={goToPrev} className="w-full py-3 text-gray-500 hover:text-gray-700">
            Back to Address
          </button>
        </div>
      )}

      {currentStep === 'confirmation' && orderId && (
        <div className="text-center space-y-6 py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Order Confirmed!</h2>
          <p className="text-gray-500">Order #{orderId.slice(0, 12)}</p>
          <p className="text-sm text-gray-400">
            Your order from {restaurantName} is being prepared.
          </p>
          <a
            href={`/store/${restaurantSlug}/order/${orderId}/track`}
            className="inline-block px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Track Your Order
          </a>
        </div>
      )}
    </div>
  );
}
