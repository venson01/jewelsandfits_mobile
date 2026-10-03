import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radius, space } from '@/constants/theme';
import { formatMoney } from '@/lib/money';
import type { OrderDetail, OrderStatus } from '@/lib/types';

import { Icon } from './icon';
import { Text } from './text';

// Same wording as the website (src/components/store/order-summary.tsx).
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  payment_failed: 'Payment failed',
};

/** The order went through: paid online, or placed as Pay on Delivery. */
export const isConfirmed = (status: OrderStatus) => ['paid', 'processing', 'shipped', 'delivered'].includes(status);

export function StatusPill({ status }: { status: OrderStatus }) {
  const tone = isConfirmed(status) ? styles.good : status === 'pending_payment' ? styles.waiting : styles.bad;
  return (
    <View style={[styles.pill, tone]}>
      <Text style={styles.pillText}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Items, totals, delivery address and tracking for one order. Delivered items get a review link. */
export function OrderBreakdown({ order }: { order: OrderDetail }) {
  const reviewable = order.status === 'delivered';
  const a = order.shippingAddress;
  return (
    <View style={styles.breakdown}>
      {order.items.map((item, i) => (
        <View key={`${item.sku}-${i}`} style={styles.itemBlock}>
          <Link href={{ pathname: '/product/[slug]', params: { slug: item.productSlug } }} asChild>
            <Pressable style={styles.item} accessibilityLabel={item.productName}>
              <Image source={item.imageUrl} alt="" style={styles.itemImage} contentFit="cover" />
              <View style={styles.flex}>
                <Text variant="bodyMedium" numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text variant="small">
                  {item.variantTitle !== 'Default' ? `${item.variantTitle} · ` : ''}Qty {item.quantity}
                </Text>
              </View>
              <Text variant="bodyMedium">{formatMoney(item.unitPrice * item.quantity)}</Text>
            </Pressable>
          </Link>
          {reviewable && item.productId ? (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/review/[productId]', params: { productId: item.productId!, name: item.productName } })
              }
              hitSlop={8}
              style={styles.reviewLink}
              accessibilityRole="button"
              accessibilityLabel={`Write a review of ${item.productName}`}>
              <Icon name="review" size={16} color={colors.plum700} />
              <Text style={styles.reviewText}>Write a review</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <View style={styles.totals}>
        <Row label="Subtotal" value={formatMoney(order.subtotal)} />
        {order.discount ? <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={formatMoney(-order.discount)} /> : null}
        <Row label={`Delivery${order.shippingZoneName ? ` · ${order.shippingZoneName}` : ''}`} value={order.shippingFee ? formatMoney(order.shippingFee) : 'Free'} />
        {order.giftWrapFee ? <Row label="Gift wrap" value={formatMoney(order.giftWrapFee)} /> : null}
        {order.tax ? <Row label="Tax" value={formatMoney(order.tax)} /> : null}
        <Row label="Total" value={formatMoney(order.total)} strong />
        <Text variant="small">
          {order.paymentMethod === 'pay_on_delivery' ? 'Pay on delivery' : `Paid online${order.paymentChannel ? ` · ${order.paymentChannel.replace(/_/g, ' ')}` : ''}`}
        </Text>
      </View>

      <View style={styles.block}>
        <Text variant="label">Delivering to</Text>
        <Text variant="small" style={styles.ink}>
          {[a.name, a.line1, a.line2, `${a.city}, ${a.state}`, a.postalCode, a.phone].filter(Boolean).join('\n')}
        </Text>
        {order.giftWrap ? (
          <Text variant="small">Gift wrapped{order.giftMessage ? `: “${order.giftMessage}”` : ''}</Text>
        ) : null}
      </View>

      {order.trackingNumber ? (
        <View style={styles.block}>
          <Text variant="label">Tracking</Text>
          <Text variant="small" style={styles.ink}>
            {order.carrier ? `${order.carrier}: ` : ''}
            {order.trackingNumber}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={strong ? styles.strong : styles.rowLabel}>{label}</Text>
      <Text style={strong ? styles.strong : styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  good: { backgroundColor: '#E3F1E8' },
  waiting: { backgroundColor: colors.blush100 },
  bad: { backgroundColor: '#FBEAEA' },
  pillText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
  breakdown: { gap: space.lg },
  itemBlock: { gap: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  reviewLink: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginLeft: 56 + space.md },
  reviewText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.plum700 },
  itemImage: { width: 56, height: 56, borderRadius: radius.card, backgroundColor: colors.blush200 },
  flex: { flex: 1, gap: 2 },
  totals: {
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.blush200,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  rowLabel: { flexShrink: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.muted },
  rowValue: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  strong: { fontFamily: fonts.sansSemiBold, fontSize: 18, color: colors.ink },
  block: { gap: space.xs },
  ink: { color: colors.ink, lineHeight: 20 },
});
