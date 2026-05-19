export const colors = {
  bg: '#0B0B10',
  bgElev: '#15151D',
  bgElev2: '#1E1E2A',
  border: '#2A2A38',
  text: '#F5F5F7',
  textDim: '#A1A1AA',
  textMute: '#6B6B78',
  accent: '#E8FF6B',
  danger: '#FF6B6B',
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayExtra: 'BricolageGrotesque_800ExtraBold',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const type = {
  hero: { fontFamily: fonts.displayExtra, fontSize: 44, lineHeight: 48, letterSpacing: -1.4 },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  body: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 16, letterSpacing: 0.2 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
} as const;
