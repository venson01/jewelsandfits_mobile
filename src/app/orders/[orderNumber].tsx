import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { formatDate, OrderBreakdown, STATUS_LABELS, StatusPill } from '@/components/order';
import { ErrorView, LoadingView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, gutter, space } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { usePayAndShowResult } from '@/lib/payment';
import { useOrder } from '@/lib/queries';

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const { data: order, error, isPending, refetch, isRefetching } = useOrder(orderNumber);
  const payAndShowResult = usePayAndShowResult();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  if (isPending) return <LoadingView />;
  if (error || !order) return <ErrorView error={error} onRetry={refetch} />;

  const pay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const placed = await api.payOrder(order.orderNumber);
      await payAndShowResult(placed.orderNumber, placed.checkoutUrl);
    } catch (e) {
      setPayError(e instanceof ApiError ? e.message : 'Couldn’t start the payment. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: order.orderNumber }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.plum700} />}>
        <View style={styles.head}>
          <StatusPill status={order.status} />
          <Text variant="small">Placed {formatDate(order.placedAt)}</Text>
        </View>

        {order.canRetryPayment ? (
          <View style={styles.pay}>
            <Text>This order hasn’t been paid yet.</Text>
            <Button title="Pay now" onPress={pay} loading={paying} />
            {payError ? <Text style={styles.error}>{payError}</Text> : null}
          </View>
        ) : null}

        <View style={styles.timeline}>
          {order.timeline.map((t, i) => (
            <View key={`${t.status}-${i}`} style={styles.step}>
              <View style={styles.dot} />
              <Text variant="bodyMedium" style={styles.stepLabel}>
                {STATUS_LABELS[t.status]}
              </Text>
              <Text variant="small">{formatDate(t.at)}</Text>
            </View>
          ))}
        </View>

        <OrderBreakdown order={order} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: gutter, gap: space.xl },
  head: { gap: space.sm },
  pay: { gap: space.md, padding: space.lg, borderRadius: 8, backgroundColor: colors.blush100 },
  error: { color: colors.danger },
  timeline: { gap: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.plum700 },
  stepLabel: { flex: 1 },
});
