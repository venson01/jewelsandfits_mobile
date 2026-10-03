import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions } from 'react-native';

import { Button } from '@/components/button';
import { ProductCard } from '@/components/product';
import { EmptyView, ErrorView, LoadingView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, gutter, space } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { useWishlist } from '@/lib/wishlist';

export default function WishlistScreen() {
  const signedIn = useSession((s) => s.status === 'signedIn');
  const { data, error, isPending, refetch, isRefetching } = useWishlist();
  const cardWidth = (useWindowDimensions().width - gutter * 2 - space.md) / 2;

  if (!signedIn) {
    return (
      <EmptyView
        title="Your wishlist"
        body="Sign in to save pieces you love. Your wishlist is shared with the website."
        action={<Button title="Sign in" onPress={() => router.navigate('/account')} />}
      />
    );
  }
  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={styles.column}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.plum700} />}
      ListHeaderComponent={
        data.items.length ? (
          <Text variant="small" style={styles.count}>
            {data.items.length} saved {data.items.length === 1 ? 'piece' : 'pieces'}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <EmptyView
          title="Nothing saved yet"
          body="Tap the heart on any piece to keep it here."
          action={<Button title="Start shopping" onPress={() => router.navigate('/shop')} />}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.sm, paddingBottom: space.xxxl, flexGrow: 1 },
  column: { gap: space.md, paddingHorizontal: gutter, marginBottom: space.xl },
  count: { paddingHorizontal: gutter, marginBottom: space.md },
});
