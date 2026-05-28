import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/design/tokens';

// Full-screen, provider-independent error state. Used both for DB-init
// failures (rendered inside the root layout) and for render-phase screen
// errors caught by the router ErrorBoundary — in the latter case the layout
// and its providers have unmounted, so this must not depend on
// SafeAreaProvider/GestureHandler. Vertical centering makes insets moot.
export function ErrorScreen({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.root}>
      {Platform.OS === 'ios' && (
        <View style={styles.icon}>
          <SymbolView
            name="exclamationmark.triangle.fill"
            tintColor={colors.textMute}
            size={44}
          />
        </View>
      )}
      <Text style={styles.headline}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <Text style={styles.ctaText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.bgElev,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  headline: { ...type.hero, color: colors.text, textAlign: 'center' },
  body: {
    ...type.body,
    color: colors.textDim,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  cta: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  ctaText: { ...type.h3, color: colors.bg },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
