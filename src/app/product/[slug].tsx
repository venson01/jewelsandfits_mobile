import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Price, ProductRow, SectionHeading, Stars, WishlistButton } from '@/components/product';
import { ErrorView, LoadingView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, fonts, gutter, radius, space } from '@/constants/theme';
import { MAX_QUANTITY, useBag } from '@/lib/bag';
import { useConfig, useProduct, useReviewEligibility } from '@/lib/queries';
import { useSession } from '@/lib/session';
import type { ProductCard, ProductDetail, Variant } from '@/lib/types';

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, error, isPending, refetch } = useProduct(slug);

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;
  // Keyed by product so state (variant, quantity) resets when a related product opens.
  return <ProductView key={data.product.id} product={data.product} related={data.related} />;
}

function defaultVariant(variants: Variant[]): Variant | undefined {
  return variants.find((v) => v.isDefault && v.stock > 0) ?? variants.find((v) => v.stock > 0) ?? variants[0];
}

function ProductView({ product, related }: { product: ProductDetail; related: ProductCard[] }) {
  const insets = useSafeAreaInsets();
  const [variant, setVariant] = useState(() => defaultVariant(product.variants));
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState<string | null>(null);
  const add = useBag((s) => s.add);
  const inBag = useBag((s) => s.items.find((i) => i.variantId === variant?.id)?.quantity ?? 0);

  const stock = variant?.stock ?? 0;
  const maxQty = Math.max(0, Math.min(stock - inBag, MAX_QUANTITY - inBag));
  const qty = Math.min(quantity, Math.max(maxQty, 1)); // what the stepper shows
  const showVariants = product.variants.length > 1 || (variant && variant.title !== 'Default');

  const chooseVariant = (v: Variant) => {
    setVariant(v);
    setQuantity(1);
    setAdded(null);
  };

  const addToBag = () => {
    if (!variant) return;
    const n = add(
      {
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        variantTitle: variant.title,
        image: product.images[0]?.url ?? null,
        unitPrice: variant.price,
        stock: variant.stock,
      },
      qty,
    );
    setAdded(n > 0 ? `Added ${n} to your bag.` : 'You already have all we have in stock in your bag.');
    setQuantity(1);
  };

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}>
        <Gallery images={product.images} name={product.name} />

        <View style={styles.body}>
          {product.category ? (
            <Text variant="eyebrow">{product.category.name}</Text>
          ) : null}
          <View style={styles.titleRow}>
            <Text variant="heading" style={styles.title}>
              {product.name}
            </Text>
            <WishlistButton productId={product.id} name={product.name} size={42} style={styles.heart} />
          </View>
          <Stars value={product.ratingAvg} count={product.ratingCount} />
          {variant ? <Price price={variant.price} compareAtPrice={variant.compareAtPrice} size="lg" /> : null}

          {showVariants ? (
            <View style={styles.block}>
              <Text variant="label">
                Option: <Text variant="small">{variant?.title}</Text>
              </Text>
              <View style={styles.variants}>
                {product.variants.map((v) => {
                  const active = v.id === variant?.id;
                  const soldOut = v.stock <= 0;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => chooseVariant(v)}
                      style={[styles.variant, active && styles.variantActive, soldOut && styles.variantSoldOut]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${v.title}${soldOut ? ', sold out' : ''}`}>
                      <Text style={[styles.variantText, active && styles.variantTextActive, soldOut && styles.strike]}>
                        {v.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.block}>
            <Text variant="small" style={stock > 0 ? styles.inStock : styles.outOfStock}>
              {stock <= 0 ? 'Sold out' : stock <= 3 ? `Only ${stock} left` : 'In stock, ready to dispatch'}
            </Text>
            {stock > 0 ? (
              <View style={styles.buyRow}>
                <Stepper value={qty} max={maxQty} onChange={setQuantity} />
                <Button title="Add to bag" onPress={addToBag} disabled={maxQty <= 0} style={styles.addButton} />
              </View>
            ) : null}
            {added ? (
              <View style={styles.added}>
                <Icon name="check" size={18} color={colors.success} />
                <Text style={styles.addedText}>{added}</Text>
                <Pressable onPress={() => router.navigate('/bag')} hitSlop={8} accessibilityRole="link">
                  <Text style={styles.link}>View bag</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {product.description ? (
            <View style={styles.block}>
              <Text variant="title">Description</Text>
              <Text style={styles.paragraph}>{product.description}</Text>
            </View>
          ) : null}

          <Specs product={product} />
          <Delivery />
          <Reviews product={product} />
        </View>

        {related.length ? (
          <View style={styles.related}>
            <SectionHeading eyebrow="Complete the fit" title="You May Also Love" />
            <ProductRow products={related} />
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

function Gallery({ images, name }: { images: ProductDetail['images']; name: string }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  if (!images.length) return <View style={[styles.galleryImage, { width }]} />;
  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        data={images}
        keyExtractor={(img, i) => `${img.url}-${i}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <Image
            source={item.url}
            alt={item.alt || name}
            style={[styles.galleryImage, { width }]}
            contentFit="cover"
            transition={200}
            priority={i === 0 ? 'high' : 'normal'}
          />
        )}
      />
      {images.length > 1 ? (
        <View style={styles.dots} accessibilityLabel={`Photo ${index + 1} of ${images.length}`}>
          {images.map((img, i) => (
            <View key={`${img.url}-${i}`} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        style={styles.stepperButton}
        accessibilityLabel="Decrease quantity">
        <Icon name="minus" size={16} color={value <= 1 ? colors.blush200 : colors.plum700} />
      </Pressable>
      <Text variant="bodyMedium" style={styles.stepperValue} accessibilityLabel={`Quantity ${value}`}>
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={styles.stepperButton}
        accessibilityLabel="Increase quantity">
        <Icon name="plus" size={16} color={value >= max ? colors.blush200 : colors.plum700} />
      </Pressable>
    </View>
  );
}

function Specs({ product }: { product: ProductDetail }) {
  const rows = [
    ['Metal', product.material],
    ['Purity', product.purity],
    ['Weight', product.weightGrams ? `${product.weightGrams} g` : null],
    ['Stones', product.gemstones],
  ].filter((r): r is [string, string] => !!r[1]);
  if (!rows.length && !product.certification && !product.careInfo) return null;
  return (
    <View style={styles.block}>
      <Text variant="title">Details</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.specRow}>
          <Text variant="small">{label}</Text>
          <Text style={styles.specValue}>{value}</Text>
        </View>
      ))}
      {product.certification ? (
        <View style={styles.note}>
          <Icon name="gem" size={18} color={colors.plum700} />
          <Text style={styles.noteText}>{product.certification}</Text>
        </View>
      ) : null}
      {product.careInfo ? (
        <>
          <Text variant="label" style={styles.subhead}>
            Care
          </Text>
          <Text style={styles.paragraph}>{product.careInfo}</Text>
        </>
      ) : null}
    </View>
  );
}

function Delivery() {
  const { data } = useConfig();
  if (!data?.shippingZones.length) return null;
  return (
    <View style={styles.block}>
      <Text variant="title">Delivery & returns</Text>
      {data.shippingZones.map((z) => (
        <View key={z.id} style={styles.specRow}>
          <Text variant="small" style={styles.zoneName}>
            {z.name}
          </Text>
          <Text style={styles.specValue}>{z.etaText}</Text>
        </View>
      ))}
      <View style={styles.note}>
        <Icon name="returns" size={18} color={colors.plum700} />
        <Text style={styles.noteText}>Easy 15-day returns.</Text>
      </View>
    </View>
  );
}

function Reviews({ product }: { product: ProductDetail }) {
  return (
    <View style={styles.block}>
      <Text variant="title">Reviews</Text>
      {product.reviews.length ? (
        product.reviews.map((r) => (
          <View key={r.id} style={styles.review}>
            <Stars value={r.rating} />
            {r.title ? <Text variant="bodyMedium">{r.title}</Text> : null}
            <Text style={styles.paragraph}>{r.body}</Text>
            <Text variant="small">
              {r.authorName} · {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        ))
      ) : (
        <Text variant="small">No reviews yet. Customers can review a piece once it has been delivered.</Text>
      )}
      <ReviewPrompt product={product} />
    </View>
  );
}

/** "Write a review" for signed-in customers whose order with this piece was delivered. */
function ReviewPrompt({ product }: { product: ProductDetail }) {
  const signedIn = useSession((s) => s.status === 'signedIn');
  const { data } = useReviewEligibility(product.id, signedIn);
  if (data?.eligible) {
    return (
      <Button
        title="Write a review"
        variant="outline"
        onPress={() => router.push({ pathname: '/review/[productId]', params: { productId: product.id, name: product.name } })}
      />
    );
  }
  if (data?.reason === 'already_reviewed') return <Text variant="small">Thanks, you’ve reviewed this piece.</Text>;
  return null;
}

const styles = StyleSheet.create({
  galleryImage: { aspectRatio: 1, backgroundColor: colors.blush200 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blush200 },
  dotActive: { backgroundColor: colors.plum700, width: 18 },
  body: { paddingHorizontal: gutter, paddingTop: space.md, gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  title: { flex: 1 },
  heart: { backgroundColor: colors.blush100 },
  block: {
    gap: space.md,
    paddingVertical: space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.blush200,
  },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  variant: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.blush200,
    backgroundColor: colors.white,
  },
  variantActive: { borderColor: colors.plum700, backgroundColor: colors.blush100 },
  variantSoldOut: { opacity: 0.55 },
  variantText: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  variantTextActive: { fontFamily: fonts.sansMedium, color: colors.plum700 },
  strike: { textDecorationLine: 'line-through' },
  inStock: { color: colors.success },
  outOfStock: { color: colors.danger },
  buyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  addButton: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.blush200,
    backgroundColor: colors.white,
  },
  stepperButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 24, textAlign: 'center' },
  added: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: colors.blush100,
  },
  addedText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  link: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.plum700, textDecorationLine: 'underline' },
  paragraph: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, color: colors.ink },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.lg },
  specValue: { flexShrink: 1, textAlign: 'right', fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  zoneName: { flexShrink: 1 },
  note: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: colors.blush100,
  },
  noteText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  subhead: { marginTop: space.xs },
  review: { gap: space.xs, paddingVertical: space.sm },
  related: { paddingTop: space.xxl },
});
