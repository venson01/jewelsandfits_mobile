import type {
  Category,
  Collection,
  HomeData,
  ProductPage,
  ProductQuery,
  ProductResponse,
  Quote,
  StoreConfig,
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
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'network_error', "We couldn't reach the store. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'server_error',
      err?.message ?? 'Something went wrong. Please try again.',
      err?.fieldErrors,
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
  quote: (items: { variantId: string; quantity: number }[], state: string | null = null) =>
    request<{ quote: Quote }>('/cart/quote', {
      method: 'POST',
      body: JSON.stringify({ items, state, giftWrap: false }),
    }),
};
