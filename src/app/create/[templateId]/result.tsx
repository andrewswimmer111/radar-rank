import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AspectToggle, type AspectRatio } from '@/components/AspectToggle';
import { HeaderBar } from '@/components/HeaderBar';
import { RadarCard } from '@/components/RadarCard';
import { getTemplate } from '@/data/templates';
import { colors, radii, spacing, type } from '@/design/tokens';
import { pickArchetype } from '@/lib/archetype';
import { useDraft } from '@/state/DraftProvider';

const ASPECT_RATIO: Record<AspectRatio, number> = { square: 1, story: 16 / 9 };

export default function ResultScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const { draft } = useDraft();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const [aspect, setAspect] = useState<AspectRatio>('square');

  const template = templateId ? getTemplate(templateId) : undefined;
  const archetype = useMemo(
    () => (template && draft ? pickArchetype(template, draft.scores) : null),
    [template, draft],
  );

  if (!template || !draft || draft.templateId !== templateId || !archetype) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HeaderBar title="Result" />
        <View style={styles.center}>
          <Text style={styles.muted}>No draft loaded</Text>
        </View>
      </SafeAreaView>
    );
  }

  const reservedV = 240 + insets.top + insets.bottom;
  const availW = SCREEN_W - spacing.xl * 2;
  const availH = SCREEN_H - reservedV;
  const ratio = ASPECT_RATIO[aspect];
  const cardW = Math.min(availW, availH / ratio);
  const cardH = cardW * ratio;

  const onEdit = () => {
    router.push({
      pathname: '/create/[templateId]',
      params: { templateId: template.id },
    });
  };

  const onSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // wired in plan-8
  };

  const onShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // wired in plan-8
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar title={template.label} />
      <View style={styles.previewArea}>
        <RadarCard
          template={template}
          draft={draft}
          archetype={archetype}
          width={cardW}
          height={cardH}
        />
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
        <AspectToggle value={aspect} onChange={setAspect} />

        <View style={styles.actionRow}>
          <Pressable
            onPress={onSave}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={styles.actionText}>Save</Text>
          </Pressable>
          <Pressable
            onPress={onShare}
            style={({ pressed }) => [styles.action, styles.actionPrimary, pressed && styles.pressed]}>
            <Text style={[styles.actionText, styles.actionPrimaryText]}>Share</Text>
          </Pressable>
        </View>

        <Pressable onPress={onEdit} style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.6 }]}>
          <Text style={styles.editText}>← Edit</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: colors.textDim },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  controls: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  action: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    backgroundColor: colors.bgElev,
  },
  actionPrimary: { backgroundColor: colors.accent },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  actionText: { ...type.h2, color: colors.text },
  actionPrimaryText: { color: colors.bg },
  editLink: { alignSelf: 'center', padding: spacing.sm },
  editText: { ...type.label, color: colors.textDim },
});
