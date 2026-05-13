/**
 * CartDrawer Component - Slide-out shopping cart.
 *
 * Displays the current cart items with quantity controls,
 * subtotal calculation, delivery fee, and checkout button.
 * Uses Zustand store for state management.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts
 */

'use client';

import { useCartStore } from '../../store/cart-store';

interface CartDrawerProps {
  restaurantName: string;
  minimumOrder: number;
}

export function CartDrawer({ restaurantName, minimumOrder }: CartDrawerProps) {
  const { items, isOpen, toggleCart, removeItem, updateQuantity, getSubtotal, getItemCount } =
    useCartStore();

  const subtotal = getSubtotal();
  const deliveryFee = 25.0;
  const total = subtotal + deliveryFee;
  const itemCount = getItemCount();
  const meetsMinimum = subtotal >= minimumOrder;

  return (
    <>
      {/* Floating Cart Button */}
      {itemCount > 0 && !isOpen && (
        <button
          onClick={toggleCart}
          className="fixed bottom-6 right-6 z-40 bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
        >
          <span className="font-medium">View Cart</span>
          <span className="bg-white text-orange-500 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
            {itemCount}
          </span>
          <span className="font-bold">R{subtotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={toggleCart} />

          <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
                <p className="text-sm text-gray-500">{restaurantName}</p>
              </div>
              <button onClick={toggleCart} className="p-2 hover:bg-gray-100 rounded-full">
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">Your cart is empty</p>
                  <p className="text-gray-400 text-sm mt-1">Add items from the menu</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.itemId} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">R{item.price.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.itemId, Math.max(0, item.quantity - 1))}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeItem(item.itemId)}
                          className="ml-2 text-red-400 hover:text-red-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - Totals + Checkout */}
            {items.length > 0 && (
              <div className="p-4 border-t border-gray-200 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>R{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery fee</span>
                  <span>R{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span>R{total.toFixed(2)}</span>
                </div>

                {!meetsMinimum && (
                  <p className="text-sm text-red-500">
                    Minimum order: R{minimumOrder.toFixed(2)} (R{(minimumOrder - subtotal).toFixed(2)} more needed)
                  </p>
                )}

                <button
                  disabled={!meetsMinimum}
                  className="w-full py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
