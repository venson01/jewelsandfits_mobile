import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, View } from 'react-native';

import { colors } from '@/constants/theme';

// SF Symbols on iOS, Material Symbols on Android and web.
const icons = {
  search: { ios: 'magnifyingglass', android: 'search' },
  bag: { ios: 'bag', android: 'shopping_bag' },
  heart: { ios: 'heart', android: 'favorite' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  close: { ios: 'xmark', android: 'close' },
  trash: { ios: 'trash', android: 'delete' },
  check: { ios: 'checkmark', android: 'check' },
  alert: { ios: 'exclamationmark.circle', android: 'error' },
  gem: { ios: 'diamond', android: 'diamond' },
  shield: { ios: 'checkmark.shield', android: 'verified_user' },
  truck: { ios: 'shippingbox', android: 'local_shipping' },
  returns: { ios: 'arrow.2.circlepath', android: 'autorenew' },
  support: { ios: 'headphones', android: 'support_agent' },
  review: { ios: 'star.bubble', android: 'rate_review' },
  bell: { ios: 'bell', android: 'notifications' },
} satisfies Record<string, PlatformSymbol>;

type PlatformSymbol = Exclude<SymbolViewProps['name'], string>;
export type IconName = keyof typeof icons;

export function Icon({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  const symbol: PlatformSymbol = icons[name];
  return <SymbolView name={{ ...symbol, web: symbol.android }} size={size} tintColor={color} />;
}

/**
 * Wishlist heart. iOS has a filled SF Symbol; Android/web draw Material Symbols from the
 * outlined font, so the filled heart is built from two circles and a rotated square.
 */
export function HeartIcon({ filled, size = 20, color = colors.plum700 }: { filled: boolean; size?: number; color?: string }) {
  if (!filled) return <Icon name="heart" size={size} color={color} />;
  if (Platform.OS === 'ios') return <SymbolView name="heart.fill" size={size} tintColor={color} />;

  const a = size * 0.5; // square side = circle diameter
  const d = a / Math.SQRT2; // half the square's diagonal
  const cx = size / 2;
  const cy = size / 2 - d / 4 + a / 4; // centres the shape vertically
  const circle = (x: number) => ({
    position: 'absolute' as const,
    width: a,
    height: a,
    borderRadius: a / 2,
    backgroundColor: color,
    left: x - a / 2,
    top: cy - d / 2 - a / 2,
  });
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: a,
          height: a,
          backgroundColor: color,
          left: cx - a / 2,
          top: cy - a / 2,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View style={circle(cx - d / 2)} />
      <View style={circle(cx + d / 2)} />
    </View>
  );
}
