import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { colors } from '@/constants/theme';

// SF Symbols on iOS, Material Symbols on Android and web.
const icons = {
  search: { ios: 'magnifyingglass', android: 'search' },
  bag: { ios: 'bag', android: 'shopping_bag' },
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
} satisfies Record<string, PlatformSymbol>;

type PlatformSymbol = Exclude<SymbolViewProps['name'], string>;
export type IconName = keyof typeof icons;

export function Icon({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  const symbol: PlatformSymbol = icons[name];
  return <SymbolView name={{ ...symbol, web: symbol.android }} size={size} tintColor={color} />;
}
