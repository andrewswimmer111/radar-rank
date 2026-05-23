import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type {
  EvaluationCategory,
  Participant,
  Score,
} from '@/db/hooks';
import { colors, radii, spacing, type } from '@/design/tokens';
import {
  categoryMeans,
  mostBalancedParticipant,
  ovrByParticipant,
  strongestCategoryByMean,
  weakestCategoryByMean,
} from '@/lib/stats';

type Props = {
  participants: readonly Participant[];
  categories: readonly EvaluationCategory[];
  scores: readonly Score[];
};

export function EvaluationSummary({ participants, categories, scores }: Props) {
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
      <Text style={styles.eyebrow}>Summary</Text>
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

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.xl },
  eyebrow: {
    ...type.eyebrow,
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: {
    flex: 1,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 2,
    minHeight: 76,
  },
  cellEyebrow: {
    ...type.eyebrow,
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  cellValue: { ...type.h2, color: colors.text },
  cellSecondary: { ...type.caption, color: colors.textDim },
});
