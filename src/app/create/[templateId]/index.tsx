import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTemplate } from '@/data/templates';
import { colors, spacing, type } from '@/design/tokens';
import { useDraft } from '@/state/DraftProvider';

export default function EditScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const { draft, loadTemplate, setName } = useDraft();
  const template = templateId ? getTemplate(templateId) : undefined;

  useEffect(() => {
    if (templateId && draft?.templateId !== templateId) loadTemplate(templateId);
  }, [templateId, draft?.templateId, loadTemplate]);

  if (!template || !draft) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: spacing.xl }}>
        <Text style={styles.eyebrow}>Template</Text>
        <Text style={styles.title}>
          {template.emoji}  {template.label}
        </Text>
        <Text style={styles.body}>{template.blurb}</Text>

        <Pressable
          onPress={() => setName('Andrew')}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
          <Text style={styles.ctaText}>Set placeholder name</Text>
        </Pressable>

        <Text style={styles.muted}>Name: {draft.name || '(empty)'}</Text>
        <Text style={styles.muted}>
          Scores: {Object.values(draft.scores).map((v) => Math.round(v)).join(', ')}
        </Text>

        <Link
          href={{
            pathname: '/create/[templateId]/result',
            params: { templateId: template.id },
          }}
          asChild>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaText}>Generate →</Text>
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
  cta: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  ctaText: { ...type.label, color: colors.bg },
  muted: { ...type.caption, color: colors.textDim, marginTop: spacing.md },
});
