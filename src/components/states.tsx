import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, space } from '@/constants/theme';
import { ApiError } from '@/lib/api';

import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.plum700} size="large" />
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
  return (
    <View style={styles.center}>
      <Icon name="alert" size={32} color={colors.muted} />
      <Text variant="body" style={styles.message}>
        {message}
      </Text>
      {onRetry ? <Button title="Try again" variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyView({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.center}>
      <Text variant="heading" style={styles.title}>
        {title}
      </Text>
      {body ? (
        <Text variant="body" style={styles.message}>
          {body}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.lg },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', color: colors.muted },
});
