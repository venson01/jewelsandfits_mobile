import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { OrderNotificationsPrompt } from '@/components/notifications-prompt';
import { LoadingView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, fonts, gutter, radius, space, tabBarInset } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { GoogleSignInError, googleUnavailableReason } from '@/lib/google';
import { queryClient, useMe } from '@/lib/queries';
import { signIn, signOut, useSession } from '@/lib/session';
import type { Address, User } from '@/lib/types';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const status = useSession((s) => s.status);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text variant="heading" style={styles.title}>
        Account
      </Text>
      {status === 'restoring' ? <LoadingView /> : status === 'signedIn' ? <SignedIn /> : <SignedOut />}
    </View>
  );
}

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'bag', text: 'Your bag follows you between the app and the website' },
  { icon: 'truck', text: 'Check out faster with saved delivery addresses' },
  { icon: 'shield', text: 'Track your orders and their delivery' },
];

function SignedOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unavailable = googleUnavailableReason();

  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      console.warn('[account] sign-in failed', err);
      if (err instanceof ApiError && err.code === 'invalid_google_token') {
        // Google signed the customer in, but our server didn't accept the token.
        setError('Our store couldn’t verify your Google sign-in. Please try again shortly.');
      } else {
        setError(
          err instanceof GoogleSignInError || err instanceof ApiError ? err.message : 'Sign-in failed. Please try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + space.xl }]}>
      <View style={styles.card}>
        <Text variant="eyebrow">Welcome</Text>
        <Text variant="heading">Sign in to Jewels & Fits</Text>
        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p.text} style={styles.perk}>
              <Icon name={p.icon} size={20} color={colors.plum700} />
              <Text style={styles.perkText}>{p.text}</Text>
            </View>
          ))}
        </View>
        <Button title="Continue with Google" onPress={onSignIn} loading={busy} disabled={!!unavailable} />
        {unavailable ? <Text variant="small">{unavailable}</Text> : null}
        {error ? (
          <View style={styles.error}>
            <Icon name="alert" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Text variant="small">We only use your Google name, email and photo to set up your account.</Text>
      </View>
    </ScrollView>
  );
}

function SignedIn() {
  const cachedUser = useSession((s) => s.user);
  const me = useMe(true);
  const user = me.data?.user ?? cachedUser;
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + space.xl }]}
      refreshControl={<RefreshControl refreshing={me.isRefetching} onRefresh={me.refetch} tintColor={colors.plum700} />}>
      {user ? <Profile user={user} /> : null}

      <Link href="/orders" asChild>
        <Pressable style={styles.menuRow} accessibilityRole="button">
          <Icon name="bag" size={20} color={colors.plum700} />
          <Text variant="bodyMedium" style={styles.menuLabel}>
            My orders
          </Text>
          <Icon name="chevronRight" size={16} color={colors.muted} />
        </Pressable>
      </Link>
      <Link href="/wishlist" asChild>
        <Pressable style={styles.menuRow} accessibilityRole="button">
          <Icon name="heart" size={20} color={colors.plum700} />
          <Text variant="bodyMedium" style={styles.menuLabel}>
            Wishlist
          </Text>
          <Icon name="chevronRight" size={16} color={colors.muted} />
        </Pressable>
      </Link>

      <Text variant="eyebrow" style={styles.sectionLabel}>
        Notifications
      </Text>
      <OrderNotificationsPrompt showWhenOn />

      <Text variant="eyebrow" style={styles.sectionLabel}>
        Saved addresses
      </Text>
      {me.isPending ? (
        <Text variant="small">Loading…</Text>
      ) : me.error ? (
        <Text variant="small">{me.error instanceof ApiError ? me.error.message : 'Couldn’t load your addresses.'}</Text>
      ) : me.data.addresses.length ? (
        <View style={styles.addresses}>
          {me.data.addresses.map((a) => (
            <AddressCard key={a.id} address={a} />
          ))}
        </View>
      ) : (
        <Text variant="small">Addresses you save at checkout will appear here.</Text>
      )}

      <Button title="Sign out" variant="outline" onPress={onSignOut} loading={signingOut} style={styles.signOut} />
    </ScrollView>
  );
}

function Profile({ user }: { user: User }) {
  const initials = (user.name ?? user.email ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <View style={styles.profile}>
      {user.image ? (
        <Image source={user.image} alt="" style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
      <View style={styles.profileText}>
        <Text variant="title">{user.name ?? 'Welcome back'}</Text>
        {user.email ? <Text variant="small">{user.email}</Text> : null}
        {user.phone ? <Text variant="small">{user.phone}</Text> : null}
      </View>
    </View>
  );
}

function AddressCard({ address: a }: { address: Address }) {
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete this address?', `${a.line1}, ${a.city}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => api.deleteAddress(a.id)) },
    ]);

  return (
    <View style={[styles.address, busy && styles.busy]}>
      <View style={styles.addressHeader}>
        <Text variant="bodyMedium">{a.name}</Text>
        {a.isDefault ? (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        ) : null}
      </View>
      <Text variant="small" style={styles.addressLines}>
        {[a.line1, a.line2, `${a.city}, ${a.state}`, a.postalCode].filter(Boolean).join('\n')}
      </Text>
      <Text variant="small">{a.phone}</Text>
      <View style={styles.addressActions}>
        {!a.isDefault ? (
          <Pressable onPress={() => run(() => api.setDefaultAddress(a.id))} disabled={busy} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>Make default</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={confirmDelete} disabled={busy} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete address ${a.line1}`}>
          <Text style={[styles.link, styles.danger]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ivory },
  title: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: space.md },
  content: { paddingHorizontal: gutter, gap: space.md },
  card: { gap: space.lg, padding: space.xl, borderRadius: radius.card, backgroundColor: colors.blush100 },
  perks: { gap: space.md },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  perkText: { flex: 1, fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: colors.ink },
  error: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  errorText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.danger },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: colors.blush100,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.blush200 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.plum700 },
  initials: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.white },
  profileText: { flex: 1, gap: 2 },
  sectionLabel: { marginTop: space.xl },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.blush200,
  },
  menuLabel: { flex: 1 },
  addresses: { gap: space.md },
  address: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.blush200,
    backgroundColor: colors.white,
  },
  busy: { opacity: 0.5 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  addressLines: { color: colors.ink },
  defaultBadge: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2, backgroundColor: colors.blush100 },
  defaultBadgeText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.plum700 },
  addressActions: { flexDirection: 'row', gap: space.xl, marginTop: space.sm },
  link: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.plum700 },
  danger: { color: colors.danger },
  signOut: { marginTop: space.xxl },
});
