import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { EvaluationCategory, Participant } from '@/db/hooks';
import { useThemedStyles, type Theme } from '@/design/theme';
import { radii, spacing, type } from '@/design/tokens';
import {
  categoryMeans,
  mostBalancedParticipant,
  ovrByParticipant,
  strongestCategoryByMean,
  weakestCategoryByMean,
} from '@/lib/stats';

// Duck-typed score input — accepts both DB Score and the synthetic
// FlatScore rows produced from consensus data.
type ScoreLike = {
  participantId: string;
  categoryKey: string;
  value: number;
};

type Props = {
  evaluationId: string;
  participants: readonly Participant[];
  categories: readonly EvaluationCategory[];
  scores: readonly ScoreLike[];
  mode?: 'yours' | 'consensus';
};

export function EvaluationSummary({
  evaluationId,
  participants,
  categories,
  scores,
  mode = 'yours',
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const active = participants.filter((p) => !p.excluded);
  if (active.length < 2) return null;
  if (scores.length === 0) return null;

  const activeIds = active.map((p) => p.id);
  const categoryKeys = categories.map((c) => c.key);

  const ovrs = ovrByParticipant(scores, categoryKeys);
  const activeOvrs = activeIds
    .map((id) => ovrs.get(id))
    .filter((v): v is number => v !== undefined);
  if (activeOvrs.length === 0) return null;

  const avgOvr = Math.round(
    activeOvrs.reduce((a, b) => a + b, 0) / activeOvrs.length,
  );

  const means = categoryMeans(scores, categoryKeys, activeIds);
  const strongest = strongestCategoryByMean(means, categories);
  const weakest = weakestCategoryByMean(means, categories);

  const balanced = mostBalancedParticipant(scores, activeIds, categoryKeys);
  const balancedName = balanced
    ? participants.find((p) => p.id === balanced.participantId)?.name ?? null
    : null;

  return (
    <Animated.View entering={FadeIn.duration(420)} style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Summary</Text>
        <Pressable
          onPress={() =>
            router.push(
              `/evaluation/${evaluationId}/insights?mode=${mode}`,
            )
          }
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="View insights"
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
          <Text style={styles.chipText}>Insights ›</Text>
        </Pressable>
      </View>
      <View style={styles.rows}>
        <View style={styles.row}>
          <Cell label="Avg OVR" value={String(avgOvr)} />
          <Cell
            label="Strongest"
            value={strongest?.label ?? '—'}
            secondary={
              strongest ? `mean ${Math.round(strongest.mean)}` : undefined
            }
          />
        </View>
        <View style={styles.row}>
          <Cell
            label="Weakest"
            value={weakest?.label ?? '—'}
            secondary={weakest ? `mean ${Math.round(weakest.mean)}` : undefined}
          />
          <Cell
            label="Most Balanced"
            value={balancedName ?? '—'}
            secondary={balanced ? `${balanced.spread}pt range` : undefined}
          />
        </View>
      </View>
    </Animated.View>
  );
}

function Cell({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.cell}>
      <Text style={styles.cellEyebrow}>{label.toUpperCase()}</Text>
      <Text style={styles.cellValue} numberOfLines={1}>
        {value}
      </Text>
      {secondary != null && (
        <Text style={styles.cellSecondary} numberOfLines={1}>
          {secondary}
        </Text>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: t.colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  chipText: { ...type.label, color: t.colors.accent },
  chipPressed: { opacity: 0.7 },
  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: {
    flex: 1,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    gap: 2,
    minHeight: 76,
  },
  cellEyebrow: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
  },
  cellValue: { ...type.h2, color: t.colors.text },
  cellSecondary: { ...type.caption, color: t.colors.textDim },
});
