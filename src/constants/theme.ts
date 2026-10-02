import { Platform } from 'react-native';

// Brand tokens, kept in step with the website's design system (website AGENTS.md §4).

export const colors = {
  plum900: '#3E1238', // deepest backgrounds
  plum700: '#5B1F52', // primary: buttons, eyebrows, small accent text
  plum500: '#7A3A6E', // pressed states
  roseGold: '#B9735F', // accent for large text only (contrast)
  blush100: '#F7EEF3', // section backgrounds
  blush200: '#EBD9E3', // image backgrounds, borders
  mauve: '#D9B8CB', // end of the hero gradient
  ivory: '#FFFCFA', // page background
  ink: '#1F1A1D', // body text
  muted: '#6E6169', // secondary text
  star: '#E8A33D',
  white: '#FFFFFF',
  danger: '#A3262A',
  success: '#2E6B4A',
} as const;

// Families registered by useFonts() in src/app/_layout.tsx. With custom fonts, pick the
// weight by family name instead of fontWeight (Android ignores fontWeight for them).
export const fonts = {
  serif: 'CormorantGaramond_500Medium',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  serifBold: 'CormorantGaramond_600SemiBold',
  sans: 'Jost_400Regular',
  sansMedium: 'Jost_500Medium',
  sansSemiBold: 'Jost_600SemiBold',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  card: 8,
  pill: 999,
} as const;

/** Side gutter for screen content. */
export const gutter = space.lg;

export const shadow = Platform.select({
  ios: { shadowColor: colors.plum700, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  default: { elevation: 2 },
});

/** Space to leave under scrolling content so the native tab bar doesn't cover it. */
export const tabBarInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
