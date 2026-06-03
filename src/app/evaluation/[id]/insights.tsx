import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import {
  useConsensus,
  useEvaluation,
  useEvaluationCategories,
  useParticipants,
  useScores,
} from '@/db/hooks';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { radii, spacing, type } from '@/design/tokens';
import { consensusToFlatScores } from '@/lib/consensus';
import {
  categoryVariance,
  closestPairs,
  mostBalancedParticipant,
  strongestSpecialist,
} from '@/lib/stats';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id, mode } = useLocalSearchParams<{
    id: string;
    mode?: 'yours' | 'consensus';
  }>();
  const isConsensus = mode === 'consensus';

  const { data: evaluation, loading } = useEvaluation(id);
  const { data: participants } = useParticipants(id);
  const { data: categories } = useEvaluationCategories(id);
  const { data: localScores } = useScores(id);
  const consensus = useConsensus(id);

  const active = useMemo(
    () => (participants ?? []).filter((p) => !p.excluded),
    [participants],
  );
  const activeIds = useMemo(() => active.map((p) => p.id), [active]);
  const categoryKeys = useMemo(
    () => (categories ?? []).map((c) => c.key),
    [categories],
  );
  const nameById = useMemo(
    () => new Map(active.map((p) => [p.id, p.name])),
    [active],
  );
  const labelByKey = useMemo(
    () => new Map((categories ?? []).map((c) => [c.key, c.label])),
    [categories],
  );
  const flatScores = useMemo(
    () =>
      isConsensus
        ? consensusToFlatScores(consensus, categoryKeys)
        : localScores ?? [],
    [isConsensus, consensus, localScores, categoryKeys],
  );

  const balanced = useMemo(
    () => mostBalancedParticipant(flatScores, activeIds, categoryKeys),
    [flatScores, activeIds, categoryKeys],
  );
  const specialist = useMemo(
    () => strongestSpecialist(flatScores, activeIds, categoryKeys),
    [flatScores, activeIds, categoryKeys],
  );
  const pairs = useMemo(
    () => closestPairs(flatScores, activeIds, categoryKeys),
    [flatScores, activeIds, categoryKeys],
  );
  const varianceRows = useMemo(() => {
    const v = categoryVariance(flatScores, categoryKeys, activeIds);
    const rows = categoryKeys.map((k) => ({
      key: k,
      label: labelByKey.get(k) ?? k,
      variance: v.get(k) ?? 0,
    }));
    rows.sort((a, b) => b.variance - a.variance);
    return rows;
  }, [flatScores, categoryKeys, activeIds, labelByKey]);
  const maxVariance = varianceRows.reduce((m, r) => Math.max(m, r.variance), 0);

  if (loading && !evaluation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Insights" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  if (!evaluation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Insights" />
        <View style={styles.center}>
          <Text style={styles.muted}>Evaluation not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (active.length < 2) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Insights" />
        <View style={styles.center}>
          <Text style={styles.muted}>
            Add at least two active participants to see insights.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="Insights" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title} numberOfLines={2}>
          {evaluation.title}
        </Text>
        <Text style={styles.subtitle}>
          {isConsensus ? 'Based on consensus votes' : 'Based on your votes'}
        </Text>

        <View style={styles.cardRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEyebrow}>Most Balanced</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {balanced ? nameById.get(balanced.participantId) ?? '—' : '—'}
            </Text>
            <Text style={styles.statSecondary}>
              {balanced ? `${balanced.spread}pt range` : ''}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEyebrow}>Top Specialist</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {specialist ? nameById.get(specialist.participantId) ?? '—' : '—'}
            </Text>
            <Text style={styles.statSecondary} numberOfLines={1}>
              {specialist
                ? `${labelByKey.get(specialist.topCategoryKey) ?? ''} · ${specialist.topScore}`
                : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Closest Matches</Text>
        <View style={styles.card}>
          {pairs.map((p, i) => (
            <View
              key={`${p.aId}-${p.bId}`}
              style={[styles.row, i > 0 && styles.rowDivider]}>
              <Text style={styles.rowName} numberOfLines={1}>
                {nameById.get(p.aId)} & {nameById.get(p.bId)}
              </Text>
              <Text style={styles.rowAccent}>{p.similarity}% alike</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Category Spread</Text>
        <Text style={styles.sectionHint}>
          How much participants differ in each category.
        </Text>
        <View style={styles.card}>
          {varianceRows.map((r, i) => {
            const frac = maxVariance > 0 ? r.variance / maxVariance : 0;
            const tag = frac >= 0.66 ? 'Divisive' : frac <= 0.2 ? 'Aligned' : '';
            return (
              <View
                key={r.key}
                style={[styles.varRow, i > 0 && styles.rowDivider]}>
                <Text style={styles.varLabel} numberOfLines={1}>
                  {r.label}
                </Text>
                <View style={styles.varBarTrack}>
                  <View
                    style={[styles.varBarFill, { width: `${Math.max(3, frac * 100)}%` }]}
                  />
                </View>
                <Text style={styles.varTag}>{tag}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  muted: { ...type.body, color: t.colors.textDim, textAlign: 'center' },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  title: { ...type.h1, color: t.colors.text },
  subtitle: {
    ...type.caption,
    color: t.colors.textMute,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  cardRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    gap: 2,
    minHeight: 84,
  },
  statEyebrow: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
  },
  statValue: { ...type.h2, color: t.colors.text },
  statSecondary: { ...type.caption, color: t.colors.textDim },
  sectionLabel: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
  },
  sectionHint: { ...type.caption, color: t.colors.textMute },
  card: {
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
  },
  rowName: { ...type.h3, color: t.colors.text, flex: 1 },
  rowAccent: { ...type.label, color: t.colors.accent },
  varRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  varLabel: { ...type.body, color: t.colors.textDim, width: 96 },
  varBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.bgElev2,
    overflow: 'hidden',
  },
  varBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: t.colors.accent,
  },
  varTag: {
    ...type.caption,
    color: t.colors.textMute,
    width: 56,
    textAlign: 'right',
  },
});
