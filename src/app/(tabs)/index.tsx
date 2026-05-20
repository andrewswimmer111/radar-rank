import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useEvaluations } from '@/db/hooks';
import { colors, radii, spacing, type } from '@/design/tokens';

export default function EvaluationsTab() {
  const { data } = useEvaluations();
  const empty = !data || data.length === 0;

  // Populated list lands in plan-16. Until then everything routes
  // through the empty state's CTA.
  if (!empty) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.eyebrow}>Evaluations</Text>
          <Text style={styles.title}>{data.length} created</Text>
          <Text style={styles.body}>
            The full list view lands in plan-16. For now, jump into one from
            the most recent (top).
          </Text>
          <Pressable
            onPress={() => router.push(`/evaluation/${data[0].id}`)}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>Open most recent →</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/evaluation/new')}
            style={({ pressed }) => [
              styles.ctaGhost,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.ctaGhostText}>+ New evaluation</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Animated.View entering={FadeIn.duration(440)} style={styles.center}>
        <View style={styles.icon}>
          {Platform.OS === 'ios' ? (
            <SymbolView
              name="chart.dots.scatter"
              tintColor={colors.textMute}
              size={48}
            />
          ) : (
            <Text style={{ fontSize: 32 }}>📊</Text>
          )}
        </View>
        <Text style={styles.eyebrow}>Evaluations</Text>
        <Text style={styles.title}>Make your first ranking.</Text>
        <Text style={styles.body}>
          Combine a collection with a template to create a working evaluation
          space.
        </Text>
        <Pressable
          onPress={() => router.push('/evaluation/new')}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <Text style={styles.ctaText}>Create your first evaluation</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
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
    backgroundColor: colors.bgElev,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  title: { ...type.hero, color: colors.text, textAlign: 'center' },
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
  ctaGhost: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  ctaGhostText: { ...type.h3, color: colors.text },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
