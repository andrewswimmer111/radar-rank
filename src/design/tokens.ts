export const colors = {
  bg: '#08080C',
  bgElev: '#13131B',
  bgElev2: '#1C1C26',
  bgElev3: '#26263A',
  border: '#26263A',
  borderSoft: '#1B1B28',
  text: '#F5F5F7',
  textDim: '#9C9CAB',
  textMute: '#5F5F70',
  accent: '#E8FF6B',
  accentSoft: '#C7E04A',
  // Foreground (text/icon) color to use on top of the accent fill. The
  // accent is a light lime, so this stays dark in both themes — don't use
  // `bg` for on-accent text, since `bg` inverts to near-white in light mode.
  onAccent: '#08080C',
  danger: '#FF6B6B',
  success: '#6BFFB1',
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
  xxl: 44,
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

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
} as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayExtra: 'BricolageGrotesque_800ExtraBold',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

// Standard press-down feedback. Used on every Pressable in the app so
// touch affordance reads consistently. The softer variant is for cards
// and rows where the scale animation would feel exaggerated.
export const pressed = {
  default: { opacity: 0.92, transform: [{ scale: 0.98 }] as const },
  soft: { opacity: 0.85 },
} as const;

export const type = {
  hero: { fontFamily: fonts.displayExtra, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.9 },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 16, letterSpacing: 0.2 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  eyebrow: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.8 },
  metric: { fontFamily: fonts.displayExtra, fontSize: 28, lineHeight: 30, letterSpacing: -0.6 },
} as const;
