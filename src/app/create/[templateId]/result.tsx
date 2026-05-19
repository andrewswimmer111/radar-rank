import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTemplate } from '@/data/templates';
import { colors, spacing, type } from '@/design/tokens';
import { pickArchetype } from '@/lib/archetype';
import { useDraft } from '@/state/DraftProvider';

export default function ResultScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const { draft } = useDraft();
  const template = templateId ? getTemplate(templateId) : undefined;

  if (!template || !draft || draft.templateId !== templateId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>No draft loaded</Text>
        <Link href="/" style={styles.linkText}>
          ← Back to picker
        </Link>
      </SafeAreaView>
    );
  }

  const archetype = pickArchetype(template, draft.scores);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: spacing.xl }}>
        <Text style={styles.eyebrow}>Result</Text>
        <Text style={styles.title}>{archetype.name}</Text>
        <Text style={styles.body}>{archetype.tagline}</Text>

        <Text style={styles.muted}>For: {draft.name || '(no name)'}</Text>
        <Text style={styles.muted}>Template: {template.label}</Text>

        <Link
          href={{ pathname: '/create/[templateId]', params: { templateId: template.id } }}
          asChild>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaText}>← Edit</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  eyebrow: { ...type.label, color: colors.textMute, textTransform: 'uppercase' },
  title: { ...type.h1, color: colors.text, marginTop: 4 },
  body: { ...type.body, color: colors.textDim, marginTop: spacing.sm },
  muted: { ...type.caption, color: colors.textDim, marginTop: spacing.md },
  cta: {
    marginTop: spacing.xl,
    backgroundColor: colors.bgElev2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  ctaText: { ...type.label, color: colors.text },
  linkText: { ...type.body, color: colors.accent, padding: spacing.xl },
});
