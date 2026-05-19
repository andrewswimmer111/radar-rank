import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { SliderRow } from '@/components/SliderRow';
import { getTemplate } from '@/data/templates';
import { colors, radii, spacing, type } from '@/design/tokens';
import { useDraft } from '@/state/DraftProvider';

export default function EditScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const { draft, loadTemplate, setName, setScore } = useDraft();
  const insets = useSafeAreaInsets();
  const template = templateId ? getTemplate(templateId) : undefined;

  useEffect(() => {
    if (templateId && draft?.templateId !== templateId) loadTemplate(templateId);
  }, [templateId, draft?.templateId, loadTemplate]);

  if (!template || !draft) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const canGenerate = draft.name.trim().length > 0;

  const onGenerate = () => {
    if (!canGenerate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({
      pathname: '/create/[templateId]/result',
      params: { templateId: template.id },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar title={`${template.emoji}  ${template.label}`} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 120 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>Subject</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="who is this?"
            placeholderTextColor={colors.textMute}
            value={draft.name}
            onChangeText={setName}
            returnKeyType="done"
            maxLength={28}
            autoCapitalize="words"
            autoCorrect={false}
          />

          <View style={styles.divider} />

          <Text style={styles.eyebrow}>Stats</Text>
          <View style={styles.sliders}>
            {template.categories.map((cat) => (
              <SliderRow
                key={cat.key}
                label={cat.label}
                accent={template.accent.start}
                value={draft.scores[cat.key] ?? 50}
                onChange={(v) => setScore(cat.key, v)}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: spacing.lg + insets.bottom }]}>
        <Pressable
          onPress={onGenerate}
          disabled={!canGenerate}
          style={({ pressed }) => [
            styles.cta,
            !canGenerate && styles.ctaDisabled,
            pressed && canGenerate && { transform: [{ scale: 0.98 }] },
          ]}>
          <Text style={[styles.ctaText, !canGenerate && styles.ctaTextDisabled]}>
            Generate →
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { ...type.body, color: colors.textDim, padding: spacing.xl },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  eyebrow: {
    ...type.label,
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  nameInput: {
    ...type.h1,
    color: colors.text,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  sliders: { marginTop: spacing.xs, gap: spacing.xs },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cta: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: colors.bgElev2 },
  ctaText: { ...type.h2, color: colors.bg },
  ctaTextDisabled: { color: colors.textMute },
});
