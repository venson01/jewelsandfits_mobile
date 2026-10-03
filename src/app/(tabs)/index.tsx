import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { CategoryTile, ProductRow, SectionHeading, Stars } from '@/components/product';
import { ErrorView, LoadingView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, fonts, gutter, radius, space, tabBarInset } from '@/constants/theme';
import { API_ORIGIN } from '@/lib/api';
import { useHome } from '@/lib/queries';
import type { Collection, Look } from '@/lib/types';

const HERO_IMAGE = `${API_ORIGIN}/images/hero.jpg`;

const HERO_BADGES: { icon: IconName; text: string }[] = [
  { icon: 'gem', text: 'Certified & quality-checked' },
  { icon: 'shield', text: '100% secure checkout' },
  { icon: 'truck', text: 'Delivery across Nigeria' },
];

// Same promises as the website's trust strip (placeholders until the owner confirms them).
const TRUST: { icon: IconName; title: string; body: string }[] = [
  { icon: 'gem', title: 'Certified Jewellery', body: 'Quality-checked, authentic & certified' },
  { icon: 'returns', title: 'Easy Returns', body: '15-day returns, no questions asked' },
  { icon: 'shield', title: 'Lifetime Exchange', body: 'Exchange or upgrade anytime' },
  { icon: 'support', title: 'Customer Support', body: "We're here to help" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, error, isPending, refetch, isRefetching } = useHome();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.wordmark}>Jewels & Fits</Text>
          <Text variant="eyebrow" style={styles.byline}>
            by saRizona
          </Text>
        </View>
        <View style={styles.topActions}>
          <Link href="/wishlist" asChild>
            <Pressable style={styles.iconButton} accessibilityLabel="Wishlist" hitSlop={8}>
              <Icon name="heart" color={colors.plum700} />
            </Pressable>
          </Link>
          <Link href="/search" asChild>
            <Pressable style={styles.iconButton} accessibilityLabel="Search" hitSlop={8}>
              <Icon name="search" color={colors.plum700} />
            </Pressable>
          </Link>
        </View>
      </View>

      {isPending ? (
        <LoadingView />
      ) : error ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarInset + space.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.plum700} />}>
          {data.announcement ? (
            <View style={styles.announcement}>
              <Text style={styles.announcementText}>{data.announcement.replace(/\s*\|\s*/g, '  ·  ')}</Text>
            </View>
          ) : null}

          <LinearGradient colors={[colors.blush100, '#EFDBE6', colors.mauve]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Image
              source={HERO_IMAGE}
              alt="Model wearing a rose-gold necklace, drop earrings and ring set with pink stones"
              style={styles.heroImage}
              contentFit="cover"
              priority="high"
              transition={300}
            />
            <View style={styles.heroBody}>
              <Text variant="eyebrow">Crafted to celebrate you</Text>
              <Text variant="display">
                Timeless Elegance.{'\n'}
                <Text variant="display" style={styles.heroAccent}>
                  Forever You.
                </Text>
              </Text>
              <Text style={styles.heroCopy}>
                Discover exquisite jewellery that blends tradition with modern elegance, chosen for your moments and
                your fits.
              </Text>
              <Button title="Explore collections" icon="arrowRight" onPress={() => router.navigate('/shop')} style={styles.heroButton} />
              <View style={styles.heroBadges}>
                {HERO_BADGES.map((b) => (
                  <View key={b.text} style={styles.heroBadge}>
                    <Icon name={b.icon} size={24} color={colors.plum700} />
                    <Text variant="small" style={styles.heroBadgeText}>
                      {b.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>

          <View style={styles.section}>
            <SectionHeading eyebrow="Shop by category" title="Find Your Piece" />
            <FlatList
              horizontal
              data={data.categories}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <CategoryTile
                  category={item}
                  onPress={() => router.push({ pathname: '/products', params: { category: item.slug, title: item.name } })}
                />
              )}
            />
          </View>

          {data.bestsellers.length ? (
            <View style={[styles.section, styles.tinted]}>
              <SectionHeading
                eyebrow="Our bestsellers"
                title="Handpicked For You"
                action={{
                  label: 'View all',
                  onPress: () => router.push({ pathname: '/products', params: { bestsellers: '1', title: 'Bestsellers' } }),
                }}
              />
              <ProductRow products={data.bestsellers} />
            </View>
          ) : null}

          {data.looks.length ? (
            <View style={styles.section}>
              <SectionHeading eyebrow="Shop the fit" title="Complete Looks, Ready to Wear" />
              <FlatList
                horizontal
                data={data.looks}
                keyExtractor={(l) => l.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                renderItem={({ item }) => <LookCard look={item} />}
              />
            </View>
          ) : null}

          {data.newArrivals.length ? (
            <View style={[styles.section, styles.tinted]}>
              <SectionHeading
                eyebrow="Just in"
                title="New Arrivals"
                action={{
                  label: 'View all',
                  onPress: () => router.push({ pathname: '/products', params: { sort: 'newest', title: 'New arrivals' } }),
                }}
              />
              <ProductRow products={data.newArrivals} />
            </View>
          ) : null}

          {data.collections.length ? (
            <View style={styles.section}>
              <SectionHeading eyebrow="Collections" title="Curated For Every Moment" />
              <FlatList
                horizontal
                data={data.collections}
                keyExtractor={(c) => c.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                renderItem={({ item }) => <CollectionCard collection={item} />}
              />
            </View>
          ) : null}

          {data.reviews.length ? (
            <View style={[styles.section, styles.tinted]}>
              <SectionHeading eyebrow="Testimonials" title="Loved By You" />
              <FlatList
                horizontal
                data={data.reviews}
                keyExtractor={(r) => r.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                renderItem={({ item }) => (
                  <View style={styles.review}>
                    <Stars value={item.rating} />
                    <Text style={styles.reviewBody} numberOfLines={5}>
                      “{item.body}”
                    </Text>
                    <Text variant="label">{item.authorName}</Text>
                    <Text variant="small" numberOfLines={1}>
                      {item.productName}
                    </Text>
                  </View>
                )}
              />
            </View>
          ) : null}

          <View style={styles.trust}>
            {TRUST.map((t) => (
              <View key={t.title} style={styles.trustItem}>
                <Icon name={t.icon} size={26} color={colors.blush200} />
                <Text style={styles.trustTitle}>{t.title}</Text>
                <Text style={styles.trustBody}>{t.body}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function LookCard({ look }: { look: Look }) {
  return (
    <View style={styles.look}>
      <Image source={look.image} alt={look.title} style={styles.lookImage} contentFit="cover" transition={200} />
      <Text variant="title">{look.title}</Text>
      <View style={styles.lookPieces}>
        {look.products.slice(0, 4).map((p) => (
          <Link key={p.id} href={{ pathname: '/product/[slug]', params: { slug: p.slug } }} asChild>
            <Pressable accessibilityLabel={p.name}>
              <Image source={p.image} alt={p.imageAlt} style={styles.lookThumb} contentFit="cover" />
            </Pressable>
          </Link>
        ))}
      </View>
      <Text variant="small">
        {look.products.length} {look.products.length === 1 ? 'piece' : 'pieces'} · tap one to shop
      </Text>
    </View>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Pressable
      style={styles.collection}
      onPress={() => router.push({ pathname: '/products', params: { collection: collection.slug, title: collection.name } })}
      accessibilityRole="button"
      accessibilityLabel={collection.name}>
      <Image source={collection.heroImage} alt="" style={styles.collectionImage} contentFit="cover" transition={200} />
      <Text variant="title">{collection.name}</Text>
      {collection.description ? (
        <Text variant="small" numberOfLines={2}>
          {collection.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ivory },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingVertical: space.sm,
  },
  wordmark: { fontFamily: fonts.serifBold, fontSize: 26, lineHeight: 30, color: colors.plum700 },
  byline: { color: colors.plum500, marginTop: -2 },
  topActions: { flexDirection: 'row', gap: space.sm },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blush100,
  },
  announcement: { backgroundColor: colors.plum700, paddingHorizontal: gutter, paddingVertical: space.sm },
  announcementText: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.white, textAlign: 'center' },
  heroImage: { width: '100%', aspectRatio: 4 / 3 },
  heroBody: { padding: gutter, paddingTop: space.xl, paddingBottom: space.xxl, gap: space.md },
  heroAccent: { color: colors.roseGold },
  heroCopy: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, color: colors.ink, opacity: 0.85 },
  heroButton: { alignSelf: 'flex-start', marginTop: space.sm },
  heroBadges: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.lg,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.plum500,
  },
  heroBadge: { flex: 1, gap: space.sm },
  heroBadgeText: { color: colors.ink },
  section: { paddingVertical: space.xxl },
  tinted: { backgroundColor: colors.blush100 },
  hList: { paddingHorizontal: gutter, gap: space.lg },
  look: { width: 240, gap: space.sm },
  lookImage: { width: 240, aspectRatio: 4 / 5, borderRadius: radius.card, backgroundColor: colors.blush200 },
  lookPieces: { flexDirection: 'row', gap: space.sm },
  lookThumb: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blush200 },
  collection: { width: 220, gap: space.sm },
  collectionImage: { width: 220, aspectRatio: 1, borderRadius: radius.card, backgroundColor: colors.blush200 },
  review: {
    width: 260,
    padding: space.lg,
    gap: space.sm,
    borderRadius: radius.card,
    backgroundColor: colors.white,
  },
  reviewBody: { fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 24, color: colors.ink },
  trust: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.plum700,
    paddingHorizontal: gutter,
    paddingVertical: space.xl,
    rowGap: space.xl,
  },
  trustItem: { width: '50%', paddingRight: space.md, gap: space.xs },
  trustTitle: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.white },
  trustBody: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.blush200 },
});
