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
  useVoteScores,
  useVoteSubmissions,
} from '@/db/hooks';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { radii, spacing, type } from '@/design/tokens';
import { timeAgo } from '@/lib/timeAgo';

export default function VoterDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id, submissionId } = useLocalSearchParams<{
    id: string;
    submissionId: string;
  }>();

  const { data: evaluation, loading } = useEvaluation(id);
  const { data: submissions } = useVoteSubmissions(id);
  const { data: voteScores } = useVoteScores(id);
  const { data: participants } = useParticipants(id);
  const { data: categories } = useEvaluationCategories(id);
  const consensus = useConsensus(id);

  const submission = useMemo(
    () => (submissions ?? []).find((s) => s.id === submissionId),
    [submissions, submissionId],
  );

  // Index this voter's scores once so the per-participant rows are O(1)
  // lookups, not a linear scan per cell.
  const valueAt = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of voteScores ?? []) {
      if (s.submissionId !== submissionId) continue;
      m.set(`${s.participantId}|${s.categoryKey}`, s.value);
    }
    return m;
  }, [voteScores, submissionId]);

  const activeParticipants = useMemo(
    () => (participants ?? []).filter((p) => !p.excluded),
    [participants],
  );
  const cats = categories ?? [];

  if (loading && !evaluation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Voter" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  if (!submission) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Voter" />
        <View style={styles.center}>
          <Text style={styles.muted}>This vote has been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="Voter" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Voter</Text>
        <Text style={styles.title} numberOfLines={2}>
          {submission.voterName}
        </Text>
        <Text style={styles.lineage}>
          Voted {timeAgo(submission.submittedAt)}
        </Text>

        <Text style={styles.sectionLabel}>
          Scores vs. consensus
        </Text>
        <Text style={styles.sectionHint}>
          Δ shows how this voter&apos;s score compares to the average across
          all voters for the same person and category.
        </Text>

        {activeParticipants.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No active participants on this evaluation.
            </Text>
          </View>
        )}

        {activeParticipants.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: p.color ?? colors.bgElev2 },
                ]}>
                <Text style={styles.chipText}>
                  {p.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardName} numberOfLines={2}>
                {p.name}
              </Text>
            </View>
            <View style={styles.cellsHeader}>
              <Text style={[styles.cellsHeaderText, styles.cellGrow]}>
                Category
              </Text>
              <Text style={[styles.cellsHeaderText, styles.cellNum]}>Vote</Text>
              <Text style={[styles.cellsHeaderText, styles.cellNum]}>Avg</Text>
              <Text style={[styles.cellsHeaderText, styles.cellNum]}>Δ</Text>
            </View>
            {cats.map((c) => {
              const v = valueAt.get(`${p.id}|${c.key}`);
              const stat = consensus?.get(p.id)?.get(c.key);
              const delta =
                v !== undefined && stat ? v - stat.mean : null;
              return (
                <View key={c.key} style={styles.cellsRow}>
                  <Text
                    style={[styles.cellLabel, styles.cellGrow]}
                    numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text style={[styles.cellValue, styles.cellNum]}>
                    {v ?? '—'}
                  </Text>
                  <Text style={[styles.cellMuted, styles.cellNum]}>
                    {stat ? stat.mean : '—'}
                  </Text>
                  <Text
                    style={[
                      styles.cellNum,
                      delta === null
                        ? styles.cellMuted
                        : delta === 0
                          ? styles.cellNeutral
                          : delta > 0
                            ? styles.cellUp
                            : styles.cellDown,
                    ]}>
                    {delta === null
                      ? '—'
                      : delta === 0
                        ? '0'
                        : delta > 0
                          ? `+${delta}`
                          : `${delta}`}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: t.colors.textDim },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  eyebrow: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
  },
  title: { ...type.hero, color: t.colors.text, marginTop: spacing.xs },
  lineage: {
    ...type.caption,
    color: t.colors.textMute,
    paddingHorizontal: spacing.sm,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
  },
  sectionHint: {
    ...type.caption,
    color: t.colors.textDim,
    paddingHorizontal: spacing.xs,
  },
  empty: {
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    marginTop: spacing.sm,
  },
  emptyText: { ...type.body, color: t.colors.textDim, textAlign: 'center' },
  card: {
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { ...type.label, color: '#fff' },
  cardName: { ...type.h3, color: t.colors.text, flex: 1 },
  cellsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
  },
  cellsHeaderText: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
  },
  cellsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cellGrow: { flex: 1 },
  cellNum: { width: 56, textAlign: 'right' },
  cellLabel: { ...type.body, color: t.colors.text },
  cellValue: { ...type.metric, color: t.colors.text, fontSize: 16 },
  cellMuted: { ...type.body, color: t.colors.textMute },
  cellNeutral: { ...type.body, color: t.colors.textDim },
  cellUp: { ...type.metric, color: t.colors.success, fontSize: 16 },
  cellDown: { ...type.metric, color: t.colors.danger, fontSize: 16 },
});
