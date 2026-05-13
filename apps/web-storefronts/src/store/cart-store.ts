/**
 * Cart Store - Zustand state management for the shopping cart.
 *
 * Manages cart items, quantities, and drawer open/close state.
 * Persists cart to localStorage for session continuity.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem: CartItem) => {
        set((state) => {
          const existing = state.items.find((i) => i.itemId === newItem.itemId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.itemId === newItem.itemId
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (itemId: string) => {
        set((state) => ({
          items: state.items.filter((i) => i.itemId !== itemId),
        }));
      },

      updateQuantity: (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.itemId === itemId ? { ...i, quantity } : i,
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'lmg-cart',
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
