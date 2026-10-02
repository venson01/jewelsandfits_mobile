import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, gutter, radius, space } from '@/constants/theme';
import { formatMoney } from '@/lib/money';
import type { Category, ProductCard as ProductCardData } from '@/lib/types';

import { Icon } from './icon';
import { Text } from './text';

export function Price({ price, compareAtPrice, size = 'sm' }: { price: number; compareAtPrice?: number | null; size?: 'sm' | 'lg' }) {
  const onSale = compareAtPrice != null && compareAtPrice > price;
  return (
    <View style={styles.priceRow}>
      <Text style={size === 'lg' ? styles.priceLg : styles.price}>{formatMoney(price)}</Text>
      {onSale ? <Text style={styles.compareAt}>{formatMoney(compareAtPrice)}</Text> : null}
    </View>
  );
}

/** ★★★★☆ (12). Hidden when a product has no reviews yet. */
export function Stars({ value, count }: { value: number; count?: number }) {
  if (count === 0) return null;
  const full = Math.round(value);
  return (
    <View style={styles.starsRow} accessibilityLabel={`Rated ${value.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ''}`}>
      <Text style={styles.stars}>
        {'★'.repeat(full)}
        <Text style={styles.starsEmpty}>{'★'.repeat(5 - full)}</Text>
      </Text>
      {count ? <Text variant="small">({count})</Text> : null}
    </View>
  );
}

function badgeFor(p: ProductCardData): string | null {
  if (!p.inStock) return 'Sold out';
  if (p.compareAtPrice != null && p.compareAtPrice > p.price) return 'Sale';
  if (p.isNew) return 'New';
  if (p.isBestseller) return 'Bestseller';
  return null;
}

/** Image on blush, name, price and rating. Tapping opens the product page. */
export function ProductCard({ product, width }: { product: ProductCardData; width?: number }) {
  const badge = badgeFor(product);
  return (
    <Link href={{ pathname: '/product/[slug]', params: { slug: product.slug } }} asChild>
      {/* Link asChild needs one style object, not an array. */}
      <Pressable style={StyleSheet.flatten([styles.card, width ? { width } : styles.cardFlex])} accessibilityLabel={product.name}>
        <View style={styles.imageWrap}>
          <Image
            source={product.image}
            alt={product.imageAlt}
            style={styles.image}
            contentFit="cover"
            transition={200}
            recyclingKey={product.id}
          />
          {badge ? (
            <View style={[styles.badge, !product.inStock && styles.badgeMuted]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text variant="bodyMedium" numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Price price={product.price} compareAtPrice={product.compareAtPrice} />
        <Stars value={product.ratingAvg} count={product.ratingCount} />
      </Pressable>
    </Link>
  );
}

const ROW_CARD_WIDTH = 168;

/** Horizontal, swipeable row of product cards. */
export function ProductRow({ products }: { products: ProductCardData[] }) {
  return (
    <FlatList
      horizontal
      data={products}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <ProductCard product={item} width={ROW_CARD_WIDTH} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rowContent}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.heading}>
      <View style={styles.headingText}>
        <Text variant="eyebrow">{eyebrow}</Text>
        <Text variant="heading">{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={12} accessibilityRole="link" style={styles.headingAction}>
          <Text style={styles.headingActionText}>{action.label}</Text>
          <Icon name="arrowRight" size={14} color={colors.plum700} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Round category photo with its name, as on the website's "Shop by category". */
export function CategoryTile({ category, size = 92, onPress }: { category: Category; size?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, { width: size + 8 }]} accessibilityRole="button" accessibilityLabel={category.name}>
      <Image
        source={category.image}
        alt=""
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.blush200 }}
        contentFit="cover"
        transition={200}
      />
      <Text style={styles.tileLabel} numberOfLines={1}>
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
  price: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.plum700 },
  priceLg: { fontFamily: fonts.sansMedium, fontSize: 22, color: colors.plum700 },
  compareAt: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, textDecorationLine: 'line-through' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stars: { fontSize: 12, color: colors.star, letterSpacing: 1 },
  starsEmpty: { color: colors.blush200 },
  card: { gap: space.xs },
  cardFlex: { flex: 1 },
  imageWrap: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.blush200, marginBottom: space.xs },
  image: { width: '100%', aspectRatio: 1 },
  badge: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    backgroundColor: colors.plum700,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  badgeMuted: { backgroundColor: colors.muted },
  badgeText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.white },
  name: { fontSize: 14, lineHeight: 19 },
  rowContent: { paddingHorizontal: gutter, gap: space.md },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    marginBottom: space.lg,
    gap: space.md,
  },
  headingText: { flex: 1, gap: space.xs },
  headingAction: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingBottom: space.xs },
  headingActionText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.plum700 },
  tile: { alignItems: 'center', gap: space.sm },
  tileLabel: { fontFamily: fonts.serifBold, fontSize: 16, color: colors.ink, textAlign: 'center' },
});
