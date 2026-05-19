import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
        <View style={styles.header}>
          <Text style={styles.eyebrow}>RadarRank</Text>
          <Text style={styles.title}>Pick a template.</Text>
          <Text style={styles.subtitle}>
            Adjust the dials. Generate the stat card. Post it. Ruin a friendship.
          </Text>
        </View>

        <View style={styles.list}>
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </View>

        <Text style={styles.footer}>more templates dropping soon</Text>
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
  header: { gap: 6 },
  eyebrow: { ...type.label, color: colors.accent, letterSpacing: 2, textTransform: 'uppercase' },
  title: { ...type.hero, color: colors.text },
  subtitle: { ...type.body, color: colors.textDim, marginTop: spacing.xs },
  list: { gap: spacing.lg },
  footer: {
    ...type.caption,
    color: colors.textMute,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
