import type {
  Address,
  CartLine,
  Category,
  CheckoutInput,
  Collection,
  HomeData,
  OrderDetail,
  OrderSummary,
  PlacedOrder,
  ProductCard,
  ProductPage,
  ProductQuery,
  ProductResponse,
  Quote,
  StoreConfig,
  User,
} from './types';

const PRODUCTION_URL = 'https://jewelsandfits.vercel.app';

/**
 * The website that serves the API. Defaults to the live site; set EXPO_PUBLIC_API_URL in
 * .env to use a local dev server instead, e.g. http://192.168.0.131:3000 (start it with
 * `pnpm dev -H 0.0.0.0` so the phone can reach it).
 */
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL || PRODUCTION_URL).replace(/\/$/, '');

const BASE = `${API_ORIGIN}/api/mobile/v1`;
const TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string>,
    /** Extra fields sent with some errors, e.g. checkout's fresh `quote` and saved `orderNumber`. */
    readonly details: { quote?: Quote; orderNumber?: string } = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Session token for signed-in requests, set by src/lib/session.ts. Kept here (not imported
// from session.ts) so the two modules don't import each other.
let sessionToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

export const hasSessionToken = () => sessionToken !== null;

/** Called when the server rejects the session token (expired or signed out elsewhere). */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const sentToken = sessionToken;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(sentToken ? { Authorization: `Bearer ${sentToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'network_error', "We couldn't reach the store. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    // Only if the token that failed is still the current one (not a request from before sign-in).
    if (res.status === 401 && sentToken && sentToken === sessionToken) onUnauthorized?.();
    throw new ApiError(
      res.status,
      err?.code ?? 'server_error',
      err?.message ?? 'Something went wrong. Please try again.',
      err?.fieldErrors,
      { quote: err?.quote, orderNumber: err?.orderNumber },
    );
  }
  return body as T;
}

function queryString(q: ProductQuery & { offset?: number; limit?: number }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) {
    if (value === undefined || value === '' || value === false) continue;
    params.set(key, value === true ? '1' : String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const api = {
  config: () => request<StoreConfig>('/config'),
  home: () => request<HomeData>('/home'),
  categories: () => request<{ categories: Category[] }>('/categories'),
  collections: () => request<{ collections: Collection[] }>('/collections'),
  products: (q: ProductQuery, offset = 0, limit = 20) =>
    request<ProductPage>(`/products${queryString({ ...q, offset, limit })}`),
  product: (slug: string) => request<ProductResponse>(`/products/${encodeURIComponent(slug)}`),
  quote: (input: QuoteInput) =>
    request<{ quote: Quote }>('/cart/quote', {
      method: 'POST',
      body: JSON.stringify({
        items: input.items,
        state: input.state ?? null,
        couponCode: input.couponCode || undefined,
        giftWrap: input.giftWrap ?? false,
      }),
    }),

  // Account (needs a session token)
  signInWithGoogle: (idToken: string, deviceName: string | null) =>
    request<{ token: string; expiresAt: string; user: User }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken, deviceName: deviceName ?? undefined }),
    }),
  signOut: () => request<{ ok: true }>('/auth/signout', { method: 'POST' }),
  me: () => request<{ user: User; addresses: Address[] }>('/me'),
  deleteAddress: (id: string) => request<{ ok: true }>(`/addresses/${id}`, { method: 'DELETE' }),
  setDefaultAddress: (id: string) => request<{ ok: true }>(`/addresses/${id}/default`, { method: 'POST' }),

  // Saved cart, shared with the website
  cart: () => request<{ lines: CartLine[] }>('/cart'),
  saveCart: (items: CartItemInput[]) =>
    request<{ lines: CartLine[] }>('/cart', { method: 'PUT', body: JSON.stringify({ items }) }),
  mergeCart: (items: CartItemInput[]) =>
    request<{ lines: CartLine[] }>('/cart/merge', { method: 'POST', body: JSON.stringify({ items }) }),

  // Checkout and orders
  checkout: (input: CheckoutInput) =>
    request<PlacedOrder>('/checkout', { method: 'POST', body: JSON.stringify(input) }),
  orders: () => request<{ orders: OrderSummary[] }>('/orders'),
  order: (orderNumber: string) => request<{ order: OrderDetail }>(`/orders/${encodeURIComponent(orderNumber)}`),
  /** New payment attempt for an unpaid order. */
  payOrder: (orderNumber: string) =>
    request<PlacedOrder>(`/orders/${encodeURIComponent(orderNumber)}/pay`, { method: 'POST' }),

  // Wishlist
  wishlist: () => request<{ productIds: string[]; items: ProductCard[] }>('/wishlist'),
  addToWishlist: (productId: string) =>
    request<{ ok: true }>('/wishlist', { method: 'POST', body: JSON.stringify({ productId }) }),
  removeFromWishlist: (productId: string) =>
    request<{ ok: true }>(`/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' }),

  // Order notifications: this device's Expo push token
  registerPushToken: (token: string, platform: 'android' | 'ios') =>
    request<{ ok: true }>('/push-tokens', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  unregisterPushToken: (token: string) =>
    request<{ ok: true }>('/push-tokens', { method: 'DELETE', body: JSON.stringify({ token }) }),

  // Reviews (moderated; only for delivered orders)
  reviewEligibility: (productId: string) =>
    request<ReviewEligibility>(`/reviews/eligibility?productId=${encodeURIComponent(productId)}`),
  submitReview: (input: { productId: string; rating: number; title?: string; body: string }) =>
    request<{ ok: true; message: string }>('/reviews', { method: 'POST', body: JSON.stringify(input) }),
};

export type ReviewEligibility = { eligible: true } | { eligible: false; reason: 'no_purchase' | 'already_reviewed' };

type CartItemInput = { variantId: string; quantity: number };

export type QuoteInput = {
  items: CartItemInput[];
  state?: string | null;
  couponCode?: string;
  giftWrap?: boolean;
};
