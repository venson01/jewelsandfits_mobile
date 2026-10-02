import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { colors, fonts } from '@/constants/theme';

const variants = StyleSheet.create({
  display: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: colors.ink },
  heading: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 32, color: colors.ink },
  title: { fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.muted },
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.plum700,
  },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, letterSpacing: 0.6, color: colors.ink },
});

export type TextVariant = keyof typeof variants;

/** Brand text. Serif variants for headings, Jost for everything else. */
export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: TextVariant }) {
  return <RNText style={[variants[variant], style]} {...rest} />;
}
