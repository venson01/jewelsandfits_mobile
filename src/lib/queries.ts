import { QueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api, ApiError, type QuoteInput } from './api';
import type { ProductQuery } from './types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // matches the API's CDN cache
      // Retry network blips, but not answers like 404 that won't change.
      retry: (count, error) => count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

const PAGE_SIZE = 20;

export const useHome = () => useQuery({ queryKey: ['home'], queryFn: api.home });

export const useConfig = () => useQuery({ queryKey: ['config'], queryFn: api.config, staleTime: 10 * 60_000 });

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: async () => (await api.categories()).categories });

export const useCollections = () =>
  useQuery({ queryKey: ['collections'], queryFn: async () => (await api.collections()).collections });

export const useProduct = (slug: string) =>
  useQuery({ queryKey: ['product', slug], queryFn: () => api.product(slug), enabled: !!slug });

export const useProducts = (q: ProductQuery) =>
  useInfiniteQuery({
    queryKey: ['products', q],
    queryFn: ({ pageParam }) => api.products(q, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.limit < last.total ? last.offset + last.limit : undefined),
  });

/** Profile and saved addresses. Only while signed in. */
export const useMe = (enabled: boolean) => useQuery({ queryKey: ['me'], queryFn: api.me, enabled });

/**
 * Live prices, stock, delivery fee and discount from the server. Keyed by the whole input,
 * so any change (bag, state, code, gift wrap) refetches; the last result shows meanwhile.
 */
export const useQuote = (input: QuoteInput) =>
  useQuery({
    queryKey: ['quote', input],
    queryFn: async () => (await api.quote(input)).quote,
    enabled: input.items.length > 0,
    staleTime: 0,
    placeholderData: (previous) => previous,
  });

/** Whether the signed-in customer may review a product (delivered order, not yet reviewed). */
export const useReviewEligibility = (productId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['review-eligibility', productId],
    queryFn: () => api.reviewEligibility(productId),
    enabled,
  });

export const useOrders =(enabled: boolean) => useQuery({ queryKey: ['orders'], queryFn: api.orders, enabled });

const SETTLED = new Set(['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'payment_failed']);

/**
 * One order. With `pollWhilePending`, re-checks every 3 s while payment is still being
 * confirmed (the webhook can land a little after the customer returns), for up to a minute.
 */
export const useOrder = (orderNumber: string | undefined, pollWhilePending = false) =>
  useQuery({
    queryKey: ['order', orderNumber],
    queryFn: async () => (await api.order(orderNumber!)).order,
    enabled: !!orderNumber,
    refetchInterval: (query) =>
      pollWhilePending && query.state.dataUpdateCount < 20 && !SETTLED.has(query.state.data?.status ?? '') ? 3000 : false,
  });
