import { useCanvasRef } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { RadarCard } from '@/components/RadarCard';
import { getTemplate } from '@/data/templates';
import { colors, radii, shadows, spacing, type } from '@/design/tokens';
import { exportFilename, snapshotCanvasToFile } from '@/lib/exportCard';
import { gradeFromScore, overallScore, topTrait } from '@/lib/stats';
import { useDraft } from '@/state/DraftProvider';

const EXPORT_WIDTH = 1080;

export default function ResultScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const { draft } = useDraft();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const exportRef = useCanvasRef();

  const template = templateId ? getTemplate(templateId) : undefined;

  if (!template || !draft || draft.templateId !== templateId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HeaderBar title="Result" />
        <View style={styles.center}>
          <Text style={styles.muted}>No draft loaded</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onEdit = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push({
      pathname: '/create/[templateId]',
      params: { templateId: template.id },
    });
  };

  // Single canonical square card. Sized to dominate the viewport while
  // leaving room for header, metadata, and the action row.
  const reservedV = 220 + insets.top + insets.bottom;
  const availW = SCREEN_W - spacing.xl * 2;
  const availH = SCREEN_H - reservedV;
  const cardSize = Math.min(availW, availH);

  const overall = overallScore(template, draft.scores);
  const grade = gradeFromScore(overall);
  const top = topTrait(template, draft.scores);

  const writeExportFile = async () => {
    return snapshotCanvasToFile(exportRef, exportFilename(template.id));
  };

  const onSave = async () => {
    if (busy) return;
    setBusy('save');
    try {
      const uri = await writeExportFile();
      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Saved', 'Card saved to Photos.');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert("Couldn't save", describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    if (busy) return;
    setBusy('share');
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable on this device.');
        return;
      }
      const uri = await writeExportFile();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your card' });
    } catch (err) {
      Alert.alert("Couldn't share", describeError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        title={template.label}
        right={
          <Pressable
            onPress={onEdit}
            hitSlop={10}
            style={({ pressed }) => [styles.editLink, pressed && styles.pressed]}>
            <Text style={styles.editLinkText}>Edit</Text>
          </Pressable>
        }
      />

      <Animated.View entering={FadeIn.duration(420)} style={styles.previewArea}>
        <View style={[styles.cardShadow, { width: cardSize, height: cardSize }]}>
          <RadarCard
            template={template}
            draft={draft}
            width={cardSize}
            height={cardSize}
          />
        </View>

        <Animated.View
          entering={FadeInDown.duration(420).delay(220)}
          style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>OVR</Text>
            <Text style={styles.metaValue}>{overall}</Text>
            <View style={styles.metaDivider} />
            <Text style={styles.metaGrade}>{grade}</Text>
          </View>
          <Text style={styles.metaCaption} numberOfLines={1}>
            Top trait · {top.label}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Offscreen export-resolution card; ref is snapshotted on demand. */}
      <View style={styles.offscreen} pointerEvents="none">
        <RadarCard
          template={template}
          draft={draft}
          width={EXPORT_WIDTH}
          height={EXPORT_WIDTH}
          canvasRef={exportRef}
        />
      </View>

      <Animated.View
        entering={FadeInDown.duration(420).delay(140)}
        style={[styles.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          onPress={onSave}
          disabled={!!busy}
          style={({ pressed }) => [
            styles.actionGhost,
            pressed && styles.pressed,
            !!busy && styles.actionBusy,
          ]}>
          {busy === 'save' ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <Text style={styles.actionGhostText}>Save</Text>
          )}
        </Pressable>
        <Pressable
          onPress={onShare}
          disabled={!!busy}
          style={({ pressed }) => [
            styles.actionPrimary,
            pressed && styles.pressed,
            !!busy && styles.actionBusy,
          ]}>
          {busy === 'share' ? (
            <ActivityIndicator color={colors.bg} size="small" />
          ) : (
            <Text style={styles.actionPrimaryText}>Share</Text>
          )}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Unknown error.';
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
    gap: spacing.lg,
  },
  cardShadow: {
    ...shadows.card,
    borderRadius: radii.xl,
  },
  metaRow: {
    alignItems: 'center',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  metaLabel: { ...type.eyebrow, color: colors.textMute },
  metaValue: { ...type.h2, color: colors.text },
  metaGrade: { ...type.h3, color: colors.accent, letterSpacing: 0 },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    backgroundColor: colors.border,
  },
  metaCaption: {
    ...type.caption,
    color: colors.textMute,
    letterSpacing: 0.6,
  },
  offscreen: {
    position: 'absolute',
    top: -20000,
    left: -20000,
    opacity: 0,
  },
  controls: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  actionGhost: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 46,
  },
  actionGhostText: {
    ...type.h3,
    color: colors.text,
  },
  actionPrimary: {
    flex: 1.4,
    paddingVertical: 11,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    minHeight: 46,
  },
  actionPrimaryText: {
    ...type.h3,
    color: colors.bg,
  },
  actionBusy: { opacity: 0.7 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  editLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  editLinkText: {
    ...type.label,
    color: colors.textDim,
  },
});
