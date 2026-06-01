import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';

// Full-screen empty / first-run state used by the three top-level tabs.
// Icon is iOS-only because the design relies on SF Symbols and there
// isn't an Android equivalent we ship today — Android sees the same
// copy without the badge, which the rest of the screen still reads.

type Props = {
  icon: SFSymbol;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  onCtaPress: () => void;
};

export function EmptyState({
  icon,
  eyebrow,
  headline,
  body,
  ctaLabel,
  onCtaPress,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View entering={FadeIn.duration(440)} style={styles.root}>
      {Platform.OS === 'ios' && (
        <View style={styles.icon}>
          <SymbolView name={icon} tintColor={colors.textMute} size={48} />
        </View>
      )}
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        onPress={onCtaPress}
        style={({ pressed: p }) => [styles.cta, p && pressed.default]}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    icon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: t.colors.bgElev,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
    },
    eyebrow: {
      ...type.eyebrow,
      color: t.colors.accent,
      textTransform: 'uppercase',
    },
    headline: { ...type.hero, color: t.colors.text, textAlign: 'center' },
    body: {
      ...type.body,
      color: t.colors.textDim,
      textAlign: 'center',
      maxWidth: 320,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    cta: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radii.pill,
      backgroundColor: t.colors.accent,
    },
    ctaText: { ...type.h3, color: t.colors.onAccent },
  });
