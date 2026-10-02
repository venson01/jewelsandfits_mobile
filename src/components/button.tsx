import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius, space } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Pill button: plum fill (primary) or plum outline. */
export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, style }: Props) {
  const primary = variant === 'primary';
  const fg = primary ? colors.white : colors.plum700;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.outline,
        pressed && (primary ? styles.primaryPressed : styles.outlinePressed),
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.label, { color: fg }]}>{title}</Text>
          {icon ? <Icon name={icon} size={16} color={fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.plum700 },
  primaryPressed: { backgroundColor: colors.plum500 },
  outline: { borderWidth: 1, borderColor: colors.plum700, backgroundColor: 'transparent' },
  outlinePressed: { backgroundColor: colors.blush100 },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, letterSpacing: 1.4, textTransform: 'uppercase' },
});
