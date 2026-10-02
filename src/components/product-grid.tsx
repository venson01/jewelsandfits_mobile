import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { colors, fonts, gutter, radius, space } from '@/constants/theme';
import { useProducts } from '@/lib/queries';
import type { ProductQuery, ProductSort } from '@/lib/types';

import { ProductCard } from './product';
import { EmptyView, ErrorView, LoadingView } from './states';
import { Text } from './text';

export const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

export function SortChips({ value, onChange }: { value: ProductSort; onChange: (sort: ProductSort) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {SORTS.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => onChange(s.value)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Two-column product grid that loads more as you scroll. */
export function ProductGrid({
  query,
  header,
  emptyTitle = 'Nothing here yet',
  emptyBody = 'New pieces arrive often. Check back soon.',
}: {
  query: ProductQuery;
  header?: React.ReactElement;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const { data, error, isPending, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProducts(query);
  // Fixed width, so a lone card on the last row stays half-width.
  const cardWidth = (useWindowDimensions().width - gutter * 2 - space.md) / 2;

  if (isPending) return <>{header}<LoadingView /></>;
  if (error) return <>{header}<ErrorView error={error} onRetry={refetch} /></>;

  const items = data.pages.flatMap((p) => p.items);
  const total = data.pages[0]?.total ?? 0;

  return (
    <FlatList
      data={items}
      keyExtractor={(p) => p.id}
      numColumns={2}
      renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
      columnWrapperStyle={styles.column}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          {header}
          {items.length ? (
            <Text variant="small" style={styles.count}>
              {total} {total === 1 ? 'piece' : 'pieces'}
            </Text>
          ) : null}
        </>
      }
      ListEmptyComponent={<EmptyView title={emptyTitle} body={emptyBody} />}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.plum700} style={styles.footer} /> : null}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} tintColor={colors.plum700} />}
      keyboardDismissMode="on-drag"
    />
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: gutter, paddingVertical: space.sm, gap: space.sm },
  chip: {
    paddingHorizontal: space.lg,
    height: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.blush200,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.plum700, borderColor: colors.plum700 },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  chipTextActive: { color: colors.white },
  content: { paddingBottom: space.xxxl, flexGrow: 1 },
  column: { gap: space.md, paddingHorizontal: gutter, marginBottom: space.xl },
  count: { paddingHorizontal: gutter, marginTop: space.xs, marginBottom: space.md },
  footer: { marginVertical: space.xl },
});
