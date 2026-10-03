import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { colors } from '@/constants/theme';

import { api } from './api';
import { queryClient } from './queries';

// Order notifications (confirmed, shipped, delivered, cancelled, refunded) are sent by the
// website through Expo's push service to every device registered on the account.
// Remote push needs a development/store build on a real device: not Expo Go on Android,
// not emulators, not web. Android also needs google-services.json in the build.

/** Matches ORDER_CHANNEL_ID on the website (src/lib/push.ts). */
export const ORDER_CHANNEL_ID = 'orders';

// Show notifications that arrive while the app is open, too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function pushSupported(): boolean {
  return (
    Platform.OS !== 'web' &&
    Device.isDevice &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  );
}

const projectId = () => Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

let registeredToken: string | null = null;

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
    name: 'Order updates',
    description: 'When your order is confirmed, shipped or delivered',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: colors.plum700,
  });
}

export type EnableResult = 'enabled' | 'denied' | 'blocked' | 'unavailable';

/**
 * Registers this device for the signed-in customer's order notifications.
 * With `ask`, shows the system permission prompt if it hasn't been answered yet;
 * without, only registers when permission was already given (e.g. at sign-in).
 */
export async function enableOrderNotifications({ ask }: { ask: boolean }): Promise<EnableResult> {
  if (!pushSupported()) return 'unavailable';
  try {
    await ensureChannel();
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && ask && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return permission.canAskAgain ? 'denied' : 'blocked';

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId() })).data;
    await api.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    registeredToken = token;
    return 'enabled';
  } catch (err) {
    // Typically a build without Firebase (google-services.json) or no network.
    console.warn('[notifications] registration failed', err);
    return 'unavailable';
  }
}

/** Stops notifications to this device for the current account. Call before signing out. */
export async function disableOrderNotificationsForThisDevice() {
  if (!pushSupported()) return;
  try {
    const token =
      registeredToken ??
      ((await Notifications.getPermissionsAsync()).granted
        ? (await Notifications.getExpoPushTokenAsync({ projectId: projectId() })).data
        : null);
    if (token) await api.unregisterPushToken(token);
  } catch (err) {
    console.warn('[notifications] unregistering failed', err);
  } finally {
    registeredToken = null;
  }
}

const ORDER_NUMBER = /^JF-\d{4}-\d{6}$/;

/**
 * Tapping an order notification opens that order, whether the app was running or launched
 * by the tap. Notifications that arrive while the app is open refresh the order screens.
 * Mount once, inside the navigator (the tabs layout).
 */
export function useOrderNotificationHandling() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handled = new Set<string>();
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      const orderNumber = response.notification.request.content.data?.orderNumber;
      if (handled.has(id) || typeof orderNumber !== 'string' || !ORDER_NUMBER.test(orderNumber)) return;
      handled.add(id);
      router.push({ pathname: '/orders/[orderNumber]', params: { orderNumber } });
    };

    // Launched by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      open(response);
      if (response) void Notifications.clearLastNotificationResponseAsync();
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const orderNumber = notification.request.content.data?.orderNumber;
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (typeof orderNumber === 'string') void queryClient.invalidateQueries({ queryKey: ['order', orderNumber] });
    });
    return () => {
      tapped.remove();
      received.remove();
    };
  }, []);
}

/** The system permission, refreshed when the app returns to the foreground (e.g. from Settings). */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<Notifications.NotificationPermissionsStatus | null>(null);
  const refresh = useCallback(async () => {
    if (!pushSupported()) return;
    setPermission(await Notifications.getPermissionsAsync());
  }, []);
  useEffect(() => {
    if (!pushSupported()) return;
    let active = true;
    const load = () =>
      Notifications.getPermissionsAsync().then((p) => {
        if (active) setPermission(p);
      });
    void load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return { permission, refresh };
}
