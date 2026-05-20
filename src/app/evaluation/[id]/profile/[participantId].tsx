import { useCanvasRef } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { RadarCard } from '@/components/RadarCard';
import { SliderRow } from '@/components/SliderRow';
import type { Category, Template as LegacyTemplate } from '@/data/types';
import {
  upsertScore,
  useEvaluation,
  useEvaluationCategories,
  useParticipants,
  useScores,
  useTemplate,
} from '@/db/hooks';
import { colors, radii, shadows, spacing, type } from '@/design/tokens';
import { exportFilename, snapshotCanvasToFile } from '@/lib/exportCard';
import { DEFAULT_ACCENT } from '@/lib/accentPresets';
import {
  gradeFromScore,
  ovrByParticipant,
  rankAmong,
} from '@/lib/stats';

const EXPORT_WIDTH = 1080;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();
  const { id, participantId } = useLocalSearchParams<{
    id: string;
    participantId: string;
  }>();

  const { data: evaluation } = useEvaluation(id);
  const { data: participants } = useParticipants(id);
  const { data: categories } = useEvaluationCategories(id);
  const { data: scoresFlat } = useScores(id);
  const { data: sourceTemplate } = useTemplate(
    evaluation?.originTemplateId ?? '',
  );

  const participant = participants?.find((p) => p.id === participantId);
  const cats = categories ?? [];

  // Local slider state — sourced from DB on mount, written back on
  // slider release. Stays the source of truth while the screen is open
  // so dragging doesn't fight a pubsub refetch.
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const initialized = useMemo(
    () =>
      Object.keys(localScores).length > 0 &&
      cats.every((c) => c.key in localScores),
    [localScores, cats],
  );

  useEffect(() => {
    if (!scoresFlat || !participantId || initialized) return;
    const next: Record<string, number> = {};
    for (const c of cats) next[c.key] = 50;
    for (const s of scoresFlat) {
      if (s.participantId === participantId) next[s.categoryKey] = s.value;
    }
    setLocalScores(next);
  }, [scoresFlat, participantId, cats, initialized]);

  // Reset local state when switching participants.
  useEffect(() => {
    setLocalScores({});
  }, [participantId]);

  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const exportRef = useCanvasRef();

  const ready =
    !!evaluation && !!participant && cats.length > 0 && initialized;

  // Peer OVRs for the rank chip — use live DB scores, not localScores.
  const peerOvrs = useMemo(() => {
    if (!participants || !scoresFlat) return [];
    const map = ovrByParticipant(
      scoresFlat,
      cats.map((c) => c.key),
    );
    return participants
      .filter((p) => !p.excluded)
      .map((p) => map.get(p.id) ?? 0);
  }, [participants, scoresFlat, cats]);

  const myOvr = useMemo(() => {
    const vals = cats.map((c) => localScores[c.key] ?? 50);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [localScores, cats]);

  const rank =
    participant && !participant.excluded ? rankAmong(myOvr, peerOvrs) : null;
  const totalPeers = peerOvrs.length;

  // Legacy-shaped objects for the existing RadarCard. plan-14 refactors
  // the card to accept DB-shaped data directly + a peerOverallScores prop.
  const legacyTemplate: LegacyTemplate | null = useMemo(() => {
    if (!ready) return null;
    return {
      id: id,
      label: sourceTemplate?.name ?? evaluation!.title,
      blurb: sourceTemplate?.blurb ?? '',
      emoji: sourceTemplate?.emoji ?? '✦',
      accent: sourceTemplate?.accent ?? DEFAULT_ACCENT,
      categories: cats.map<Category>((c) => ({
        key: c.key,
        label: c.label,
        hint: c.hint ?? undefined,
      })),
    };
  }, [ready, id, sourceTemplate, evaluation, cats]);

  const legacyDraft = useMemo(
    () => ({ templateId: id, name: participant?.name ?? '', scores: localScores }),
    [id, participant?.name, localScores],
  );

  if (!ready || !legacyTemplate) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Profile" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  const onSlide = (categoryKey: string, value: number) => {
    setLocalScores((prev) => ({ ...prev, [categoryKey]: value }));
  };

  const onCommit = async (categoryKey: string, value: number) => {
    await upsertScore({
      evaluationId: id,
      participantId: participantId,
      categoryKey,
      value: Math.round(value),
    });
  };

  const writeExportFile = async () => {
    return snapshotCanvasToFile(exportRef, exportFilename(id));
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
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your card',
      });
    } catch (err) {
      Alert.alert("Couldn't share", describeError(err));
    } finally {
      setBusy(null);
    }
  };

  // Card preview sized to about half the screen height-budget — leaves
  // room for sliders + footer.
  const previewSize = Math.min(SCREEN_W - spacing.xl * 2, 360);
  const grade = gradeFromScore(myOvr);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar
        title={participant!.name}
        right={
          participant!.excluded ? (
            <View style={styles.excludedTag}>
              <Text style={styles.excludedText}>Excl.</Text>
            </View>
          ) : null
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={FadeIn.duration(420)}
          style={styles.previewWrap}>
          <View
            style={[
              styles.cardShadow,
              { width: previewSize, height: previewSize },
            ]}>
            <RadarCard
              template={legacyTemplate}
              draft={legacyDraft}
              width={previewSize}
              height={previewSize}
            />
          </View>

          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>OVR</Text>
            <Text style={styles.metaValue}>{myOvr}</Text>
            <View style={styles.metaDivider} />
            <Text style={styles.metaGrade}>{grade}</Text>
            {rank !== null && (
              <>
                <View style={styles.metaDivider} />
                <Text style={styles.metaRank}>
                  #{rank}/{totalPeers}
                </Text>
              </>
            )}
          </View>
        </Animated.View>

        <Text style={styles.eyebrow}>Stats</Text>
        <View style={styles.sliders}>
          {cats.map((c) => (
            <SliderRow
              key={c.key}
              label={c.label}
              accent={legacyTemplate.accent.start}
              value={localScores[c.key] ?? 50}
              onChange={(v) => onSlide(c.key, v)}
              onCommit={(v) => onCommit(c.key, v)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Offscreen export-resolution card; ref is snapshotted on demand. */}
      <View style={styles.offscreen} pointerEvents="none">
        <RadarCard
          template={legacyTemplate}
          draft={legacyDraft}
          width={EXPORT_WIDTH}
          height={EXPORT_WIDTH}
          canvasRef={exportRef}
        />
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}>
        <Pressable
          onPress={onSave}
          disabled={!!busy}
          style={({ pressed }) => [
            styles.actionGhost,
            pressed && styles.pressed,
            !!busy && styles.actionBusy,
          ]}>
          {busy === 'save' ? (
            <ActivityIndicator color={colors.text} />
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
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.actionPrimaryText}>Share</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Unknown error.';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  previewWrap: { alignItems: 'center', gap: spacing.md },
  cardShadow: { ...shadows.card, borderRadius: radii.xl },
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
  metaRank: { ...type.label, color: colors.text },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    backgroundColor: colors.border,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.textMute,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  sliders: { gap: spacing.xs },
  excludedTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  excludedText: { ...type.eyebrow, color: colors.textMute },
  offscreen: {
    position: 'absolute',
    top: -20000,
    left: -20000,
    opacity: 0,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 48,
  },
  actionGhostText: { ...type.h3, color: colors.text },
  actionPrimary: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    minHeight: 48,
  },
  actionPrimaryText: { ...type.h3, color: colors.bg },
  actionBusy: { opacity: 0.7 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
