import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { CategoryTile } from '@/components/product';
import { ErrorView, LoadingView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, fonts, gutter, radius, space, tabBarInset } from '@/constants/theme';
import { useCategories, useCollections } from '@/lib/queries';

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const collections = useCollections();
  const refetch = () => Promise.all([categories.refetch(), collections.refetch()]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="heading">Shop</Text>
        <Link href="/search" asChild>
          <Pressable style={styles.searchBar} accessibilityRole="search" accessibilityLabel="Search jewellery">
            <Icon name="search" size={18} color={colors.muted} />
            <Text style={styles.searchPlaceholder}>Search rings, necklaces, gold…</Text>
          </Pressable>
        </Link>
      </View>

      {categories.isPending || collections.isPending ? (
        <LoadingView />
      ) : categories.error || collections.error ? (
        <ErrorView error={categories.error ?? collections.error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarInset + space.xl }}
          refreshControl={
            <RefreshControl
              refreshing={categories.isRefetching || collections.isRefetching}
              onRefresh={refetch}
              tintColor={colors.plum700}
            />
          }>
          <Pressable
            style={styles.allRow}
            onPress={() => router.push({ pathname: '/products', params: { title: 'All jewellery' } })}
            accessibilityRole="button">
            <Text variant="bodyMedium">Shop all jewellery</Text>
            <Icon name="chevronRight" size={16} color={colors.plum700} />
          </Pressable>

          <Text variant="eyebrow" style={styles.sectionLabel}>
            Categories
          </Text>
          <View style={styles.grid}>
            {categories.data.map((c) => (
              <View key={c.id} style={styles.gridCell}>
                <CategoryTile
                  category={c}
                  size={88}
                  onPress={() => router.push({ pathname: '/products', params: { category: c.slug, title: c.name } })}
                />
              </View>
            ))}
          </View>

          <Text variant="eyebrow" style={styles.sectionLabel}>
            Collections
          </Text>
          <View style={styles.collections}>
            {collections.data.map((c) => (
              <Pressable
                key={c.id}
                style={styles.collection}
                onPress={() => router.push({ pathname: '/products', params: { collection: c.slug, title: c.name } })}
                accessibilityRole="button"
                accessibilityLabel={c.name}>
                <Image source={c.heroImage} alt="" style={styles.collectionImage} contentFit="cover" transition={200} />
                <View style={styles.collectionText}>
                  <Text variant="title">{c.name}</Text>
                  {c.description ? (
                    <Text variant="small" numberOfLines={2}>
                      {c.description}
                    </Text>
                  ) : null}
                </View>
                <Icon name="chevronRight" size={16} color={colors.plum700} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ivory },
  header: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: space.md, gap: space.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.blush100,
  },
  searchPlaceholder: { fontFamily: fonts.sans, fontSize: 15, color: colors.muted },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: gutter,
    marginTop: space.sm,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.blush200,
  },
  sectionLabel: { paddingHorizontal: gutter, marginTop: space.xl, marginBottom: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: gutter / 2, rowGap: space.xl },
  gridCell: { width: '33.333%', alignItems: 'center' },
  collections: { paddingHorizontal: gutter, gap: space.md },
  collection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.card,
    backgroundColor: colors.blush100,
  },
  collectionImage: { width: 72, height: 72, borderRadius: radius.card, backgroundColor: colors.blush200 },
  collectionText: { flex: 1, gap: 2 },
});
