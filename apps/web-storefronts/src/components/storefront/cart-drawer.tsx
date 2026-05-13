/**
 * CartDrawer Component (P190)
 *
 * Slide-out cart drawer anchored to the right side of the viewport.
 * Manages cart items with quantity controls, special instructions,
 * and checkout navigation.
 *
 * State: Uses Zustand cart store via useCartStore hook.
 *
 * @module web-storefronts/components/storefront/cart-drawer
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  specialInstructions: string | null;
}

export interface CartDrawerProps {
  restaurantSlug: string;
  restaurantName: string;
  minimumOrder: number;
  isOpen: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CartDrawer({
  restaurantSlug,
  restaurantName,
  minimumOrder,
  isOpen: restaurantIsOpen,
}: CartDrawerProps): React.JSX.Element {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  // Listen for add-to-cart events from MenuItemCard
  useEffect(() => {
    const handleAddToCart = (event: Event): void => {
      const detail = (event as CustomEvent).detail as CartItem;
      setItems((prev) => {
        const existing = prev.find(
          (i) => i.menuItemId === detail.menuItemId,
        );
        if (existing) {
          return prev.map((i) =>
            i.menuItemId === detail.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          );
        }
        return [...prev, { ...detail, quantity: 1 }];
      });
      setIsDrawerOpen(true);
    };

    window.addEventListener('lmg:add-to-cart', handleAddToCart);
    return () => window.removeEventListener('lmg:add-to-cart', handleAddToCart);
  }, []);

  // Calculate totals
  const subtotal = items.reduce((total, item) => {
    const optionsExtra = item.selectedOptions.reduce(
      (sum, opt) => sum + opt.priceAdjustment,
      0,
    );
    return total + (item.price + optionsExtra) * item.quantity;
  }, 0);

  const meetsMinimum = subtotal >= minimumOrder;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Quantity controls
  const updateQuantity = useCallback(
    (menuItemId: string, delta: number): void => {
      setItems((prev) =>
        prev
          .map((item) =>
            item.menuItemId === menuItemId
              ? { ...item, quantity: Math.max(0, item.quantity + delta) }
              : item,
          )
          .filter((item) => item.quantity > 0),
      );
    },
    [],
  );

  const removeItem = useCallback((menuItemId: string): void => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }, []);

  const clearCart = useCallback((): void => {
    setItems([]);
    setIsDrawerOpen(false);
  }, []);

  return (
    <>
      {/* Floating cart button (visible when drawer is closed and cart has items) */}
      {!isDrawerOpen && itemCount > 0 && (
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-3
                     bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700
                     transition-all transform hover:scale-105"
        >
          <span className="bg-white text-green-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
            {itemCount}
          </span>
          <span className="font-medium">View Cart</span>
          <span className="font-bold">R{subtotal.toFixed(2)}</span>
        </button>
      )}

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl
                    transform transition-transform duration-300 ease-in-out ${
                      isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
            <p className="text-sm text-gray-500">{restaurantName}</p>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Your cart is empty</p>
              <p className="text-gray-300 text-sm mt-1">
                Add items from the menu to get started
              </p>
            </div>
          ) : (
            items.map((item) => {
              const optionsExtra = item.selectedOptions.reduce(
                (sum, opt) => sum + opt.priceAdjustment,
                0,
              );
              const itemTotal = (item.price + optionsExtra) * item.quantity;

              return (
                <div
                  key={item.menuItemId}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {item.name}
                    </h4>
                    {item.selectedOptions.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.selectedOptions
                          .map((o) => o.choiceLabel)
                          .join(', ')}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      R{itemTotal.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-green-500 text-green-600 hover:bg-green-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with totals and checkout */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">
                R{subtotal.toFixed(2)}
              </span>
            </div>

            {/* Minimum order warning */}
            {!meetsMinimum && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                Minimum order is R{minimumOrder.toFixed(0)}. Add R
                {(minimumOrder - subtotal).toFixed(2)} more.
              </p>
            )}

            {/* Clear cart */}
            <button
              onClick={clearCart}
              className="w-full text-sm text-red-500 hover:text-red-700 py-1"
            >
              Clear cart
            </button>

            {/* Checkout button */}
            <a
              href={
                meetsMinimum && restaurantIsOpen
                  ? `/store/${restaurantSlug}/order`
                  : '#'
              }
              className={`block w-full text-center py-3 rounded-lg font-medium transition-colors ${
                meetsMinimum && restaurantIsOpen
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {!restaurantIsOpen
                ? 'Restaurant Closed'
                : !meetsMinimum
                  ? `Minimum R${minimumOrder.toFixed(0)}`
                  : `Checkout - R${subtotal.toFixed(2)}`}
            </a>
          </div>
        )}
      </div>
    </>
  );
}
