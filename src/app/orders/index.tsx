import { Link, router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { formatDate, StatusPill } from '@/components/order';
import { EmptyView, ErrorView, LoadingView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, gutter, radius, space } from '@/constants/theme';
import { formatMoney } from '@/lib/money';
import { useOrders } from '@/lib/queries';
import { useSession } from '@/lib/session';

export default function OrdersScreen() {
  const signedIn = useSession((s) => s.status === 'signedIn');
  const { data, error, isPending, refetch, isRefetching } = useOrders(signedIn);

  if (!signedIn) {
    return <EmptyView title="Sign in to see your orders" action={<Button title="Go to Account" onPress={() => router.navigate('/account')} />} />;
  }
  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <FlatList
      data={data.orders}
      keyExtractor={(o) => o.orderNumber}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.plum700} />}
      ListEmptyComponent={
        <EmptyView
          title="No orders yet"
          body="When you place an order, you can follow it here."
          action={<Button title="Start shopping" onPress={() => router.navigate('/shop')} />}
        />
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/orders/[orderNumber]', params: { orderNumber: item.orderNumber } }} asChild>
          <Pressable style={styles.row} accessibilityLabel={`Order ${item.orderNumber}`}>
            <View style={styles.rowText}>
              <Text variant="bodyMedium">{item.orderNumber}</Text>
              <Text variant="small">
                {formatDate(item.placedAt)} · {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'} · {formatMoney(item.total)}
              </Text>
              <StatusPill status={item.status} />
            </View>
            <Icon name="chevronRight" size={16} color={colors.muted} />
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: gutter, gap: space.md, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.blush200,
    backgroundColor: colors.white,
  },
  rowText: { flex: 1, gap: space.xs },
});
