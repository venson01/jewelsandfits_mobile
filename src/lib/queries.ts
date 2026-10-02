import { QueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api, ApiError } from './api';
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

/** Live prices and stock for the bag. Keyed by contents, so edits refetch. */
export const useQuote = (items: { variantId: string; quantity: number }[]) =>
  useQuery({
    queryKey: ['quote', items],
    queryFn: async () => (await api.quote(items)).quote,
    enabled: items.length > 0,
    staleTime: 0,
    placeholderData: (previous) => previous,
  });
