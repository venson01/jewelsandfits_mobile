import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { EmptyView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, fonts, gutter, radius, space, tabBarInset } from '@/constants/theme';
import { MAX_QUANTITY, useBag, type BagItem } from '@/lib/bag';
import { formatMoney } from '@/lib/money';
import { useQuote } from '@/lib/queries';
import type { QuoteLine } from '@/lib/types';

export default function BagScreen() {
  const insets = useSafeAreaInsets();
  const items = useBag((s) => s.items);
  const request = useMemo(() => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), [items]);
  const quote = useQuote(request);
  const live = new Map((quote.data?.lines ?? []).map((l) => [l.variantId, l]));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text variant="heading" style={styles.title}>
        Your bag
      </Text>

      {!items.length ? (
        <EmptyView
          title="Your bag is empty"
          body="Pieces you add will wait for you here."
          action={<Button title="Start shopping" onPress={() => router.navigate('/shop')} />}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: tabBarInset + space.xl }}>
          {quote.data?.problems.length ? (
            <View style={styles.problems}>
              <Icon name="alert" size={18} color={colors.danger} />
              <Text style={styles.problemText}>{quote.data.problems.join(' ')}</Text>
            </View>
          ) : null}

          {items.map((item) => (
            <Line
              key={item.variantId}
              item={item}
              live={live.get(item.variantId)}
              unavailable={!!quote.data && !quote.isPlaceholderData && !live.has(item.variantId)}
            />
          ))}

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Subtotal</Text>
              {quote.data ? (
                <Text style={styles.subtotal}>{formatMoney(quote.data.totals.subtotal)}</Text>
              ) : quote.isPending ? (
                <ActivityIndicator color={colors.plum700} />
              ) : (
                <Text variant="small">Couldn&apos;t load prices</Text>
              )}
            </View>
            <Text variant="small">Delivery and any discount codes are worked out at checkout.</Text>
            <View style={styles.notice}>
              <Icon name="bag" size={18} color={colors.plum700} />
              <Text style={styles.noticeText}>Checkout in the app is coming in the next update. Your bag is saved on this phone until then.</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Line({ item, live, unavailable }: { item: BagItem; live?: QuoteLine; unavailable: boolean }) {
  const setQuantity = useBag((s) => s.setQuantity);
  const remove = useBag((s) => s.remove);
  const unitPrice = live?.unitPrice ?? item.unitPrice;
  const max = Math.min(item.stock, MAX_QUANTITY);

  return (
    <View style={styles.line}>
      <Link href={{ pathname: '/product/[slug]', params: { slug: item.slug } }} asChild>
        <Pressable accessibilityLabel={item.name}>
          <Image source={live?.imageUrl ?? item.image} alt="" style={styles.lineImage} contentFit="cover" />
        </Pressable>
      </Link>
      <View style={styles.lineBody}>
        <Text variant="bodyMedium" numberOfLines={2}>
          {item.name}
        </Text>
        {item.variantTitle !== 'Default' ? <Text variant="small">{item.variantTitle}</Text> : null}
        {unavailable ? (
          <Text style={styles.unavailable}>No longer available</Text>
        ) : (
          <Text style={styles.linePrice}>{formatMoney(unitPrice * item.quantity)}</Text>
        )}
        <View style={styles.lineActions}>
          {!unavailable ? (
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setQuantity(item.variantId, item.quantity - 1)}
                style={styles.stepperButton}
                accessibilityLabel={`Decrease quantity of ${item.name}`}>
                <Icon name="minus" size={14} color={colors.plum700} />
              </Pressable>
              <Text variant="bodyMedium" style={styles.stepperValue}>
                {item.quantity}
              </Text>
              <Pressable
                onPress={() => setQuantity(item.variantId, item.quantity + 1)}
                disabled={item.quantity >= max}
                style={styles.stepperButton}
                accessibilityLabel={`Increase quantity of ${item.name}`}>
                <Icon name="plus" size={14} color={item.quantity >= max ? colors.blush200 : colors.plum700} />
              </Pressable>
            </View>
          ) : null}
          <Pressable onPress={() => remove(item.variantId)} hitSlop={8} accessibilityLabel={`Remove ${item.name}`} style={styles.remove}>
            <Icon name="trash" size={18} color={colors.muted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ivory },
  title: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: space.md },
  problems: {
    flexDirection: 'row',
    gap: space.sm,
    marginHorizontal: gutter,
    marginBottom: space.md,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: '#FBEAEA',
  },
  problemText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.danger },
  line: {
    flexDirection: 'row',
    gap: space.md,
    marginHorizontal: gutter,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.blush200,
  },
  lineImage: { width: 88, height: 88, borderRadius: radius.card, backgroundColor: colors.blush200 },
  lineBody: { flex: 1, gap: 2 },
  linePrice: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.plum700, marginTop: 2 },
  unavailable: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.danger, marginTop: 2 },
  lineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.blush200,
    backgroundColor: colors.white,
  },
  stepperButton: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 20, textAlign: 'center', fontSize: 14 },
  remove: { padding: space.xs },
  summary: { margin: gutter, marginTop: space.xl, gap: space.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subtotal: { fontFamily: fonts.sansSemiBold, fontSize: 18, color: colors.ink },
  notice: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: colors.blush100,
    marginTop: space.sm,
  },
  noticeText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
});
