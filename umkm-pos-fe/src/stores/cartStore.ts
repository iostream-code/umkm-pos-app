import { create } from "zustand";
import type { Product, CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  customerId: string | null;
  discountCode: string | null;
  discountAmount: number;
  taxPercentage: number;
  notes: string;

  // Computed
  subtotal: () => number;
  total: () => number;
  taxAmount: () => number;
  itemCount: () => number;

  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  setCustomer: (customerId: string | null) => void;
  setDiscount: (code: string, amount: number) => void;
  clearDiscount: () => void;
  setTax: (percentage: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  customerId: null,
  discountCode: null,
  discountAmount: 0,
  taxPercentage: 0,
  notes: "",

  // ── Computed ─────────────────────────────────────────────────
  subtotal: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),

  taxAmount: () => {
    const base = get().subtotal() - get().discountAmount;
    return base * (get().taxPercentage / 100);
  },

  total: () => {
    return get().subtotal() - get().discountAmount + get().taxAmount();
  },

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  // ── Actions ──────────────────────────────────────────────────
  addItem: (product) => {
    const existing = get().items.find((i) => i.product.id === product.id);

    if (existing) {
      // Tambah qty jika produk sudah ada
      set((state) => ({
        items: state.items.map((i) =>
          i.product.id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: i.product.price * (i.quantity + 1),
              }
            : i,
        ),
      }));
    } else {
      set((state) => ({
        items: [
          ...state.items,
          {
            product,
            quantity: 1,
            discount: 0,
            subtotal: product.price,
            price: product.price,
          } as CartItem,
        ],
      }));
    }
  },

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    })),

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: qty, subtotal: i.product.price * qty }
          : i,
      ),
    }));
  },

  setCustomer: (id) => set({ customerId: id }),
  setDiscount: (code, amount) =>
    set({ discountCode: code, discountAmount: amount }),
  clearDiscount: () => set({ discountCode: null, discountAmount: 0 }),
  setTax: (pct) => set({ taxPercentage: pct }),
  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({
      items: [],
      customerId: null,
      discountCode: null,
      discountAmount: 0,
      taxPercentage: 0,
      notes: "",
    }),
}));
