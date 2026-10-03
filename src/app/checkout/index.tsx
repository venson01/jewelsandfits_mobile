import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Choice, StatePicker, SwitchRow, TextField } from '@/components/form';
import { Icon } from '@/components/icon';
import { EmptyView, LoadingView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, fonts, gutter, radius, space } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useBag } from '@/lib/bag';
import { googleUnavailableReason } from '@/lib/google';
import { formatMoney } from '@/lib/money';
import { usePayAndShowResult } from '@/lib/payment';
import { queryClient, useConfig, useMe, useQuote } from '@/lib/queries';
import { signIn, useSession } from '@/lib/session';
import type { Address } from '@/lib/types';

export default function CheckoutScreen() {
  const status = useSession((s) => s.status);
  if (status === 'restoring') return <LoadingView />;
  if (status !== 'signedIn') return <SignInFirst />;
  return <CheckoutForm />;
}

function SignInFirst() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unavailable = googleUnavailableReason();
  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <EmptyView
      title="Sign in to check out"
      body="Your bag comes with you. We'll use your account for order updates and saved addresses."
      action={
        <View style={styles.signInActions}>
          <Button title="Continue with Google" onPress={onSignIn} loading={busy} disabled={!!unavailable} />
          {unavailable || error ? <Text style={styles.errorText}>{error ?? unavailable}</Text> : null}
        </View>
      }
    />
  );
}

type Draft = { name: string; phone: string; line1: string; line2: string; city: string; state: string; postalCode: string };

function CheckoutForm() {
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const items = useBag((s) => s.items);
  const request = useMemo(() => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), [items]);
  const config = useConfig();
  const me = useMe(true);
  const payAndShowResult = usePayAndShowResult();

  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  // A saved address id or 'new'. Until the customer picks, use the default saved address
  // (or the new-address form when there are none).
  const [chosenAddressId, setAddressId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [saveAddress, setSaveAddress] = useState(true);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'pay_on_delivery'>('online');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addresses = me.data?.addresses;
  const addressId =
    chosenAddressId ?? (addresses ? (addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? 'new') : null);

  const saved: Address | undefined =
    addressId && addressId !== 'new' ? me.data?.addresses.find((a) => a.id === addressId) : undefined;
  const state = saved ? saved.state : draft.state || null;
  const quote = useQuote({ items: request, state, couponCode: couponCode || undefined, giftWrap });
  const q = quote.data;

  const setField = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const err = (key: string) => fieldErrors[key];

  if (!items.length) {
    return (
      <EmptyView
        title="Your bag is empty"
        body="Add something you love, then come back to check out."
        action={<Button title="Start shopping" onPress={() => router.navigate('/shop')} />}
      />
    );
  }
  if (config.isPending || me.isPending || addressId === null) return <LoadingView />;

  const providerName = config.data?.paymentProvider === 'flutterwave' ? 'Flutterwave' : 'Paystack';
  const canPlace = !!q && !quote.isPlaceholderData && !!q.zone && q.lines.length > 0 && !q.problems.length;

  const place = async () => {
    if (!q?.zone) {
      setFormError('Choose a delivery state to see your delivery fee.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    const address = saved
      ? {
          name: saved.name,
          phone: saved.phone,
          line1: saved.line1,
          line2: saved.line2 ?? '',
          city: saved.city,
          state: saved.state,
          postalCode: saved.postalCode ?? '',
        }
      : draft;
    try {
      const placed = await api.checkout({
        email: email.trim(),
        phone: phone.trim(),
        address,
        saveAddress: !saved && saveAddress,
        shippingZoneId: q.zone.id,
        giftWrap,
        giftMessage: giftWrap ? giftMessage.trim() : '',
        couponCode: couponCode || '',
        paymentMethod,
        items: request,
      });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (!saved && saveAddress) void queryClient.invalidateQueries({ queryKey: ['me'] });
      await payAndShowResult(placed.orderNumber, placed.checkoutUrl);
    } catch (e) {
      if (e instanceof ApiError) {
        setFieldErrors(e.fieldErrors ?? {});
        setFormError(e.message);
        if (e.details.orderNumber) {
          // The order was saved but payment couldn't start; the result screen offers a retry.
          router.replace({ pathname: '/checkout/result', params: { order: e.details.orderNumber } });
          return;
        }
        if (e.details.quote) void quote.refetch();
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Section title="Contact">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={err('email')}
          />
          <TextField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="0803 123 4567"
            error={err('phone')}
          />
        </Section>

        <Section title="Delivery address">
          {me.data?.addresses.map((a) => (
            <Choice key={a.id} selected={addressId === a.id} onPress={() => setAddressId(a.id)} label={`${a.name}, ${a.line1}`}>
              <Text variant="bodyMedium">{a.name}</Text>
              <Text variant="small" style={styles.inkSmall}>
                {[a.line1, a.line2, `${a.city}, ${a.state}`].filter(Boolean).join(', ')}
              </Text>
              <Text variant="small">{a.phone}</Text>
            </Choice>
          ))}
          {me.data?.addresses.length ? (
            <Choice selected={addressId === 'new'} onPress={() => setAddressId('new')} label="Use a new address">
              <Text variant="bodyMedium">Use a new address</Text>
            </Choice>
          ) : null}

          {addressId === 'new' ? (
            <View style={styles.fields}>
              <TextField label="Full name" value={draft.name} onChangeText={setField('name')} autoComplete="name" error={err('address.name')} />
              <TextField
                label="Phone for delivery"
                value={draft.phone}
                onChangeText={setField('phone')}
                keyboardType="phone-pad"
                autoComplete="tel"
                error={err('address.phone')}
              />
              <TextField
                label="Street address"
                value={draft.line1}
                onChangeText={setField('line1')}
                autoComplete="street-address"
                error={err('address.line1')}
              />
              <TextField label="Apartment, landmark" optional value={draft.line2} onChangeText={setField('line2')} error={err('address.line2')} />
              <TextField label="City" value={draft.city} onChangeText={setField('city')} error={err('address.city')} />
              <StatePicker
                label="State"
                value={draft.state}
                states={config.data?.states ?? []}
                onChange={setField('state')}
                error={err('address.state')}
              />
              <TextField
                label="Postal code"
                optional
                value={draft.postalCode}
                onChangeText={setField('postalCode')}
                keyboardType="number-pad"
                maxLength={6}
                error={err('address.postalCode')}
              />
              <SwitchRow label="Save this address" hint="For faster checkout next time" value={saveAddress} onChange={setSaveAddress} />
            </View>
          ) : null}
        </Section>

        <Section title="Delivery">
          {!state ? (
            <Text variant="small">Choose a state to see delivery options.</Text>
          ) : !q ? (
            <Text variant="small">Checking delivery…</Text>
          ) : q.zone ? (
            <View style={styles.zone}>
              <Icon name="truck" size={22} color={colors.plum700} />
              <View style={styles.zoneText}>
                <Text variant="bodyMedium">{q.zone.name}</Text>
                <Text variant="small">{q.zone.etaText}</Text>
              </View>
              <Text variant="bodyMedium">{q.totals.shippingFee ? formatMoney(q.totals.shippingFee) : 'Free'}</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>We don’t deliver to {state} yet. Please contact us.</Text>
          )}
          {q?.zone?.freeOver && q.totals.shippingFee > 0 ? (
            <Text variant="small">Free delivery on orders over {formatMoney(q.zone.freeOver)}.</Text>
          ) : null}
        </Section>

        <Section title="Gift options">
          <SwitchRow
            label="Gift wrap"
            hint={config.data ? `Beautifully wrapped, +${formatMoney(config.data.giftWrapFee)}` : undefined}
            value={giftWrap}
            onChange={setGiftWrap}
          />
          {giftWrap ? (
            <TextField
              label="Gift message"
              optional
              value={giftMessage}
              onChangeText={setGiftMessage}
              multiline
              maxLength={300}
              style={styles.multiline}
              error={err('giftMessage')}
            />
          ) : null}
        </Section>

        <Section title="Discount code">
          {couponCode ? (
            <View style={styles.coupon}>
              <View style={styles.zoneText}>
                <Text variant="bodyMedium">{couponCode}</Text>
                {q?.coupon ? (
                  <Text style={q.coupon.applied ? styles.successText : styles.errorText}>{q.coupon.message}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => {
                  setCouponCode('');
                  setCodeInput('');
                }}
                hitSlop={8}
                accessibilityRole="button">
                <Text style={styles.link}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <View style={styles.couponInput}>
                <TextField label="Code" value={codeInput} onChangeText={setCodeInput} autoCapitalize="characters" autoCorrect={false} />
              </View>
              <Button
                title="Apply"
                variant="outline"
                onPress={() => setCouponCode(codeInput.trim().toUpperCase())}
                disabled={!codeInput.trim()}
                style={styles.applyButton}
              />
            </View>
          )}
        </Section>

        <Section title="Payment">
          <Choice selected={paymentMethod === 'online'} onPress={() => setPaymentMethod('online')} label="Pay online">
            <Text variant="bodyMedium">Pay online</Text>
            <Text variant="small">Card, bank transfer or USSD, secured by {providerName}</Text>
          </Choice>
          {config.data?.payOnDelivery ? (
            <Choice
              selected={paymentMethod === 'pay_on_delivery'}
              onPress={() => setPaymentMethod('pay_on_delivery')}
              label="Pay on delivery">
              <Text variant="bodyMedium">Pay on delivery</Text>
              <Text variant="small">Pay when your order arrives</Text>
            </Choice>
          ) : null}
        </Section>

        <Section title="Order summary">
          {q ? (
            <>
              {q.lines.map((l) => (
                <View key={l.variantId} style={styles.line}>
                  <Image source={l.imageUrl} alt="" style={styles.lineImage} contentFit="cover" />
                  <View style={styles.zoneText}>
                    <Text variant="bodyMedium" numberOfLines={2}>
                      {l.productName}
                    </Text>
                    <Text variant="small">
                      {l.variantTitle !== 'Default' ? `${l.variantTitle} · ` : ''}Qty {l.quantity}
                    </Text>
                  </View>
                  <Text variant="bodyMedium">{formatMoney(l.unitPrice * l.quantity)}</Text>
                </View>
              ))}
              {q.problems.length ? <Text style={styles.errorText}>{q.problems.join(' ')}</Text> : null}
              <View style={styles.totals}>
                <TotalRow label="Subtotal" value={q.totals.subtotal} />
                {q.totals.discount ? <TotalRow label="Discount" value={-q.totals.discount} /> : null}
                <TotalRow label="Delivery" value={q.totals.shippingFee} free={!!q.zone} pending={!q.zone} />
                {q.totals.giftWrapFee ? <TotalRow label="Gift wrap" value={q.totals.giftWrapFee} /> : null}
                {q.totals.tax ? <TotalRow label="Tax" value={q.totals.tax} /> : null}
                <TotalRow label="Total" value={q.totals.total} strong />
              </View>
            </>
          ) : (
            <Text variant="small">Loading your order…</Text>
          )}
        </Section>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        {formError ? (
          <View style={styles.formError}>
            <Icon name="alert" size={18} color={colors.danger} />
            <Text style={[styles.errorText, styles.flex]}>{formError}</Text>
          </View>
        ) : null}
        <Button
          title={
            paymentMethod === 'pay_on_delivery'
              ? 'Place order'
              : q && !quote.isPlaceholderData
                ? `Pay ${formatMoney(q.totals.total)}`
                : 'Pay'
          }
          onPress={place}
          loading={submitting}
          disabled={!canPlace}
        />
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title">{title}</Text>
      {children}
    </View>
  );
}

function TotalRow({ label, value, strong, free, pending }: { label: string; value: number; strong?: boolean; free?: boolean; pending?: boolean }) {
  const text = pending ? 'Choose a state' : free && value === 0 ? 'Free' : formatMoney(value);
  return (
    <View style={styles.totalRow}>
      <Text style={strong ? styles.totalStrong : styles.totalLabel}>{label}</Text>
      <Text style={strong ? styles.totalStrong : styles.totalValue}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ivory },
  content: { paddingHorizontal: gutter, paddingBottom: space.xxl },
  section: {
    gap: space.md,
    paddingVertical: space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.blush200,
  },
  fields: { gap: space.md, marginTop: space.xs },
  inkSmall: { color: colors.ink },
  zone: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  zoneText: { flex: 1, gap: 2 },
  flex: { flex: 1 },
  multiline: { minHeight: 80, paddingTop: space.md, textAlignVertical: 'top' },
  coupon: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  couponRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  couponInput: { flex: 1 },
  applyButton: { minHeight: 48 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  lineImage: { width: 56, height: 56, borderRadius: radius.card, backgroundColor: colors.blush200 },
  totals: { gap: space.sm, marginTop: space.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontFamily: fonts.sans, fontSize: 15, color: colors.muted },
  totalValue: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  totalStrong: { fontFamily: fonts.sansSemiBold, fontSize: 18, color: colors.ink, marginTop: space.xs },
  footer: {
    gap: space.sm,
    paddingHorizontal: gutter,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.blush200,
    backgroundColor: colors.ivory,
  },
  formError: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  errorText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.danger },
  successText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.success },
  link: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.plum700 },
  signInActions: { alignItems: 'center', gap: space.md },
});
