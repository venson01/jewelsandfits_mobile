import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The shopping bag, saved on the device. Name, price and image are a display snapshot
 * only: the bag screen asks the API for live prices and stock (POST /cart/quote), and
 * checkout recalculates everything on the server.
 */
export type BagItem = {
  variantId: string;
  quantity: number;
  slug: string;
  name: string;
  variantTitle: string;
  image: string | null;
  unitPrice: number;
  stock: number;
};

export const MAX_QUANTITY = 20; // same limit as the API

const clamp = (quantity: number, stock: number) => Math.max(0, Math.min(quantity, stock, MAX_QUANTITY));

type BagState = {
  items: BagItem[];
  /** Adds to any quantity already in the bag. Returns the quantity actually added. */
  add: (item: Omit<BagItem, 'quantity'>, quantity: number) => number;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Replaces the whole bag (adopting the account's saved cart). */
  replaceAll: (items: BagItem[]) => void;
};

export const useBag = create<BagState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, quantity) => {
        const existing = get().items.find((i) => i.variantId === item.variantId);
        const before = existing?.quantity ?? 0;
        const after = clamp(before + quantity, item.stock);
        if (after === before) return 0;
        set((state) => ({
          items: existing
            ? state.items.map((i) => (i.variantId === item.variantId ? { ...item, quantity: after } : i))
            : [...state.items, { ...item, quantity: after }],
        }));
        return after - before;
      },
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.variantId === variantId ? { ...i, quantity: clamp(quantity, i.stock) } : i))
            .filter((i) => i.quantity > 0),
        })),
      remove: (variantId) => set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
      replaceAll: (items) => set({ items: items.filter((i) => i.quantity > 0) }),
    }),
    { name: 'jf-bag', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const useBagCount = () => useBag((state) => state.items.reduce((n, i) => n + i.quantity, 0));
