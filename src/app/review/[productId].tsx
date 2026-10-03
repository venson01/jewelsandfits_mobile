import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/form';
import { Icon } from '@/components/icon';
import { EmptyView } from '@/components/states';
import { Text } from '@/components/text';
import { colors, fonts, gutter, space } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { queryClient } from '@/lib/queries';
import { useSession } from '@/lib/session';

const RATING_WORDS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const MIN_BODY = 10; // same as the website's reviewSchema

/** Write a review. The server checks the customer has a delivered order for the product. */
export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const { productId, name } = useLocalSearchParams<{ productId: string; name?: string }>();
  const signedIn = useSession((s) => s.status === 'signedIn');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const header = <Stack.Screen options={{ title: 'Write a review', presentation: 'modal' }} />;

  if (!signedIn) {
    return (
      <>
        {header}
        <EmptyView title="Sign in to review" action={<Button title="Go to Account" onPress={() => router.navigate('/account')} />} />
      </>
    );
  }

  if (done) {
    return (
      <>
        {header}
        <EmptyView
          title="Thank you!"
          body={done}
          action={<Button title="Done" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} />}
        />
      </>
    );
  }

  const submit = async () => {
    if (!rating) return setError('Choose a star rating.');
    if (body.trim().length < MIN_BODY) return setError('Write at least a sentence about the piece.');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitReview({ productId, rating, title: title.trim(), body: body.trim() });
      void queryClient.invalidateQueries({ queryKey: ['review-eligibility', productId] });
      setDone(res.message);
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldErrors ? Object.values(e.fieldErrors)[0] : e.message) : 'Couldn’t send your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        {name ? <Text variant="heading">{name}</Text> : null}

        <View style={styles.block}>
          <Text variant="label">Your rating</Text>
          <View style={styles.stars} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: rating }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
                <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
              </Pressable>
            ))}
          </View>
          <Text variant="small">{rating ? RATING_WORDS[rating - 1] : 'Tap a star to rate'}</Text>
        </View>

        <TextField label="Title" optional value={title} onChangeText={setTitle} maxLength={120} placeholder="Sum it up in a few words" />
        <TextField
          label="Your review"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
          placeholder="How does it look and feel? How did you wear it?"
          style={styles.multiline}
        />
        <Text variant="small">Reviews appear after a quick check by our team. Only your first name and last initial are shown.</Text>

        {error ? (
          <View style={styles.error}>
            <Icon name="alert" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Button title="Submit review" onPress={submit} loading={submitting} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: gutter, gap: space.lg },
  block: { gap: space.xs },
  stars: { flexDirection: 'row', gap: space.sm },
  star: { fontSize: 38, lineHeight: 44, color: colors.blush200 },
  starOn: { color: colors.star },
  multiline: { minHeight: 140, paddingTop: space.md, textAlignVertical: 'top' },
  error: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  errorText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.danger },
});
