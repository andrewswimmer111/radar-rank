import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TemplateCard } from '@/components/TemplateCard';
import { TEMPLATES } from '@/data/templates';
import { colors, spacing, type } from '@/design/tokens';

export default function Index() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
          <Text style={styles.eyebrow}>RadarRank</Text>
          <Text style={styles.title}>Make a stat card.</Text>
          <Text style={styles.subtitle}>
            Pick a profile. Adjust the dials. Export a card you'd want to collect.
          </Text>
        </Animated.View>

        <View style={styles.list}>
          {TEMPLATES.map((t, i) => (
            <TemplateCard key={t.id} template={t} index={i} />
          ))}
        </View>

        <Text style={styles.footer}>More templates coming.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  header: { gap: 8 },
  eyebrow: {
    ...type.eyebrow,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  title: { ...type.hero, color: colors.text, marginTop: 2 },
  subtitle: {
    ...type.body,
    color: colors.textDim,
    marginTop: spacing.xs,
    maxWidth: 320,
  },
  list: { gap: spacing.lg },
  footer: {
    ...type.caption,
    color: colors.textMute,
    textAlign: 'center',
    marginTop: spacing.lg,
    letterSpacing: 0.3,
  },
});
