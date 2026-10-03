import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/constants/theme';
import {
  enableOrderNotifications,
  pushSupported,
  useNotificationPermission,
  type EnableResult,
} from '@/lib/notifications';

import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

/**
 * Asks to turn on order notifications. Hidden where push can't work (Expo Go, emulators,
 * web). Once allowed, shows nothing, or a short "on" line with `showWhenOn`.
 */
export function OrderNotificationsPrompt({
  title = 'Get order updates',
  body = 'We’ll let you know when your order is confirmed, ships and arrives.',
  showWhenOn = false,
}: {
  title?: string;
  body?: string;
  showWhenOn?: boolean;
}) {
  const { permission, refresh } = useNotificationPermission();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EnableResult | null>(null);

  if (!pushSupported() || !permission) return null;

  if (permission.granted && result !== 'unavailable') {
    return showWhenOn ? (
      <View style={styles.onRow}>
        <Icon name="bell" size={20} color={colors.plum700} />
        <Text style={styles.onText}>Order notifications are on. You can turn them off in your phone’s settings.</Text>
      </View>
    ) : null;
  }

  const blocked = !permission.granted && !permission.canAskAgain;
  const onPress = async () => {
    if (blocked) {
      await Linking.openSettings();
      return;
    }
    setBusy(true);
    setResult(await enableOrderNotifications({ ask: true }));
    await refresh();
    setBusy(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Icon name="bell" size={22} color={colors.plum700} />
        <Text variant="bodyMedium" style={styles.flex}>
          {title}
        </Text>
      </View>
      <Text variant="small" style={styles.body}>
        {blocked ? 'Notifications are turned off for Jewels & Fits. You can turn them on in Settings.' : body}
      </Text>
      <Button title={blocked ? 'Open settings' : 'Turn on notifications'} variant="outline" onPress={onPress} loading={busy} />
      {result === 'unavailable' ? (
        <Text variant="small">Notifications aren’t available in this version of the app yet.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.lg, borderRadius: radius.card, backgroundColor: colors.blush100 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  body: { color: colors.ink },
  onRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  onText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.muted },
});
