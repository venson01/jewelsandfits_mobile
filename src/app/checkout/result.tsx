import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { OrderNotificationsPrompt } from '@/components/notifications-prompt';
import { isConfirmed, OrderBreakdown } from '@/components/order';
import { EmptyView, ErrorView, LoadingView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, gutter, space } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useBag } from '@/lib/bag';
import { usePayAndShowResult } from '@/lib/payment';
import { useOrder } from '@/lib/queries';

function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
}

/**
 * After checkout: opened by the app, or by the payment provider's return link
 * (jewelsandfits://checkout/result?status=…&order=JF-…). The `status` param is only a hint;
 * the order is re-read from the API, and polled while payment is still being confirmed.
 */
export default function CheckoutResultScreen() {
  const insets = useSafeAreaInsets();
  const { order: orderNumber, status: hint } = useLocalSearchParams<{ order?: string; status?: string }>();
  const { data: order, error, isPending, refetch, isFetching } = useOrder(orderNumber, true);
  const clearBag = useBag((s) => s.clear);
  const payAndShowResult = usePayAndShowResult();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const confirmed = !!order && isConfirmed(order.status);

  // The order went through: empty the bag (bag sync empties the account's cart too).
  useEffect(() => {
    if (confirmed) clearBag();
  }, [confirmed, clearBag]);

  // Back leaves the checkout flow instead of returning to the form or the payment page.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, []);

  const retry = async () => {
    if (!orderNumber) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const placed = await api.payOrder(orderNumber);
      await payAndShowResult(placed.orderNumber, placed.checkoutUrl);
      void refetch();
    } catch (e) {
      setRetryError(e instanceof ApiError ? e.message : 'Couldn’t start the payment. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  const header = <Stack.Screen options={{ title: 'Your order', headerBackVisible: false, gestureEnabled: false }} />;

  if (!orderNumber) {
    return (
      <>
        {header}
        <EmptyView
          title={hint === 'cancelled' ? 'Payment cancelled' : 'We couldn’t find that order'}
          body="Your orders are listed under Account → My orders."
          action={<Button title="Continue shopping" onPress={goHome} />}
        />
      </>
    );
  }
  if (isPending) return <>{header}<LoadingView /></>;
  if (error || !order) return <>{header}<ErrorView error={error} onRetry={refetch} /></>;

  const awaiting = order.status === 'pending_payment';
  const failed = order.status === 'payment_failed';

  return (
    <>
      {header}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <View style={styles.hero}>
          {confirmed ? (
            <View style={[styles.badge, styles.badgeGood]}>
              <Icon name="check" size={30} color={colors.white} />
            </View>
          ) : awaiting ? (
            <ActivityIndicator size="large" color={colors.plum700} />
          ) : (
            <View style={[styles.badge, styles.badgeBad]}>
              <Icon name="alert" size={30} color={colors.white} />
            </View>
          )}
          <Text variant="heading" style={styles.center}>
            {confirmed
              ? 'Thank you!'
              : awaiting
                ? hint === 'cancelled'
                  ? 'Payment not completed'
                  : 'Confirming your payment…'
                : failed
                  ? 'Payment didn’t go through'
                  : 'This order was cancelled'}
          </Text>
          <Text style={styles.lead}>
            {confirmed
              ? `Order ${order.orderNumber} is confirmed. We've emailed the details to ${order.email}.`
              : awaiting
                ? hint === 'cancelled'
                  ? `Order ${order.orderNumber} is saved. You can pay for it now or later from My orders.`
                  : `This usually takes a few seconds. If you closed the payment page before paying, you can pay below.`
                : failed
                  ? `Order ${order.orderNumber} is saved. Nothing was charged; please try again.`
                  : `Order ${order.orderNumber} was cancelled. Need help? Contact us.`}
          </Text>
        </View>

        {confirmed ? <OrderNotificationsPrompt title="Get notified when it ships" /> : null}

        <View style={styles.actions}>
          {order.canRetryPayment ? (
            <Button title={failed || hint === 'cancelled' ? 'Try payment again' : 'Pay now'} onPress={retry} loading={retrying} />
          ) : null}
          {retryError ? <Text style={styles.error}>{retryError}</Text> : null}
          {awaiting ? (
            <Button title="Check again" variant="outline" onPress={() => refetch()} loading={isFetching && !retrying} />
          ) : null}
          {confirmed ? (
            <Button
              title="View order"
              variant="outline"
              onPress={() => router.replace({ pathname: '/orders/[orderNumber]', params: { orderNumber: order.orderNumber } })}
            />
          ) : null}
          <Button title="Continue shopping" variant={confirmed ? 'primary' : 'outline'} onPress={goHome} />
        </View>

        <OrderBreakdown order={order} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: gutter, gap: space.xl },
  hero: { alignItems: 'center', gap: space.md, paddingTop: space.xl },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  badgeGood: { backgroundColor: colors.success },
  badgeBad: { backgroundColor: colors.danger },
  center: { textAlign: 'center' },
  lead: { textAlign: 'center', color: colors.muted, lineHeight: 22 },
  actions: { gap: space.md },
  error: { color: colors.danger, textAlign: 'center' },
});
