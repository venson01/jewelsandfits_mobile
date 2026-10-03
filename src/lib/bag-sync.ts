import { api, hasSessionToken } from './api';
import { useBag, type BagItem } from './bag';
import type { CartLine } from './types';

// While signed in, the bag mirrors the account's saved cart, which the website shares:
// - at sign-in, the device bag is merged into it (POST /cart/merge, larger quantity wins)
// - at app start, the saved cart is adopted (GET /cart), so website changes show up
// - every change on the phone is saved (PUT /cart), debounced

const SAVE_DELAY_MS = 800;
let adopting = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function toItem(line: CartLine): BagItem {
  return {
    variantId: line.variantId,
    quantity: line.quantity,
    slug: line.slug,
    name: line.name,
    variantTitle: line.variantTitle,
    image: line.image,
    unitPrice: line.unitPrice,
    stock: line.stock,
  };
}

/** The bag is restored from AsyncStorage asynchronously; wait so we don't race it. */
function bagHydrated(): Promise<void> {
  if (useBag.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useBag.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

function adopt(lines: CartLine[]) {
  adopting = true;
  try {
    useBag.getState().replaceAll(lines.map(toItem));
  } finally {
    adopting = false;
  }
}

export async function mergeBagIntoAccount() {
  await bagHydrated();
  const items = useBag.getState().items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  const { lines } = await api.mergeCart(items);
  adopt(lines);
}

export async function pullBagFromAccount() {
  await bagHydrated();
  const { lines } = await api.cart();
  adopt(lines);
}

/** Call once at startup: saves bag edits to the account while signed in. */
export function startBagSync() {
  return useBag.subscribe((state, prev) => {
    if (adopting || state.items === prev.items || !hasSessionToken()) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!hasSessionToken()) return; // signed out meanwhile
      const items = useBag.getState().items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
      api.saveCart(items).catch((err) => console.warn('[bag] saving to account failed', err));
    }, SAVE_DELAY_MS);
  });
}
