import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ProductGrid, SortChips } from '@/components/product-grid';
import type { ProductSort } from '@/lib/types';

/**
 * Product listing for a category, a collection, bestsellers or everything.
 * Params: category | collection | bestsellers=1, plus optional sort and a header title.
 */
export default function ProductsScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    collection?: string;
    bestsellers?: string;
    sort?: ProductSort;
    title?: string;
  }>();
  const [sort, setSort] = useState<ProductSort>(params.sort ?? 'featured');

  return (
    <>
      <Stack.Screen options={{ title: params.title ?? 'Shop' }} />
      <ProductGrid
        query={{
          category: params.category,
          collection: params.collection,
          bestsellers: params.bestsellers === '1',
          sort,
        }}
        header={<SortChips value={sort} onChange={setSort} />}
      />
    </>
  );
}
