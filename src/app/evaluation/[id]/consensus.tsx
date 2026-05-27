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
  useSubmissionCount,
  type Participant,
} from '@/db/hooks';
import { colors, radii, spacing, type } from '@/design/tokens';
import type { ConsensusMap } from '@/lib/consensus';

export default function ConsensusScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: evaluation, loading } = useEvaluation(id);
  const { data: participants } = useParticipants(id);
  const { data: categories } = useEvaluationCategories(id);
  const { data: voteCount } = useSubmissionCount(id);
  const consensus = useConsensus(id);

  const categoryKeys = useMemo(
    () => (categories ?? []).map((c) => c.key),
    [categories],
  );

  // Sort by consensus OVR descending so the highest-rated participant
  // leads. Participants without consensus data fall to the bottom.
  const ordered = useMemo(() => {
    const list = participants ?? [];
    if (!consensus) return list;
    return [...list].sort((a, b) => {
      const oa = consensusOvr(a.id, consensus, categoryKeys);
      const ob = consensusOvr(b.id, consensus, categoryKeys);
      if (oa === null && ob === null) return 0;
      if (oa === null) return 1;
      if (ob === null) return -1;
      return ob - oa;
    });
  }, [participants, consensus, categoryKeys]);

  if (loading && !evaluation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Consensus" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  const count = voteCount ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="Consensus" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>
          {evaluation?.title ?? 'Evaluation'}
        </Text>
        <Text style={styles.subtitle}>
          {count === 0
            ? 'No votes yet'
            : `Average of ${count} ${count === 1 ? 'vote' : 'votes'}`}
        </Text>

        {count === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Share this evaluation and collect votes to see consensus stats.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {ordered.map((p) => (
              <ConsensusListRow
                key={p.id}
                participant={p}
                consensus={consensus}
                categoryKeys={categoryKeys}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ConsensusListRow({
  participant,
  consensus,
  categoryKeys,
}: {
  participant: Participant;
  consensus: ConsensusMap | null;
  categoryKeys: string[];
}) {
  const inner = consensus?.get(participant.id) ?? null;
  const ovr = consensusOvr(participant.id, consensus, categoryKeys);
  // Mean of per-category population variances — single dispersion summary
  // per participant. High = voters disagreed a lot, low = consensus tight.
  const avgVariance = useMemo(() => {
    if (!inner) return null;
    const vars: number[] = [];
    for (const k of categoryKeys) {
      const stat = inner.get(k);
      if (stat) vars.push(stat.variance);
    }
    if (vars.length === 0) return null;
    return vars.reduce((a, b) => a + b, 0) / vars.length;
  }, [inner, categoryKeys]);

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.colorChip,
          { backgroundColor: participant.color ?? colors.bgElev2 },
        ]}>
        <Text style={styles.colorChipText}>
          {participant.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.rowName} numberOfLines={1}>
          {participant.name}
        </Text>
        {avgVariance !== null && (
          <Text style={styles.rowVariance}>
            ± {Math.round(Math.sqrt(avgVariance))} avg
          </Text>
        )}
      </View>
      {ovr !== null ? (
        <View style={styles.rowRight}>
          <Text style={styles.rowOvr}>{ovr}</Text>
        </View>
      ) : (
        <Text style={styles.rowOvrMuted}>—</Text>
      )}
    </View>
  );
}

function consensusOvr(
  participantId: string,
  consensus: ConsensusMap | null,
  categoryKeys: string[],
): number | null {
  if (!consensus) return null;
  const inner = consensus.get(participantId);
  if (!inner) return null;
  const means: number[] = [];
  for (const k of categoryKeys) {
    const stat = inner.get(k);
    if (stat) means.push(stat.mean);
  }
  if (means.length === 0) return null;
  return Math.round(means.reduce((a, b) => a + b, 0) / means.length);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...type.hero,
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
  },
  subtitle: {
    ...type.body,
    color: colors.textDim,
    marginTop: spacing.xs,
  },
  empty: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyText: {
    ...type.body,
    color: colors.textDim,
    textAlign: 'center',
  },
  list: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
    minHeight: 64,
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipText: { ...type.h3, color: '#fff' },
  rowMid: { flex: 1, gap: 2 },
  rowName: { ...type.h3, color: colors.text },
  rowVariance: { ...type.caption, color: colors.textMute },
  rowRight: { alignItems: 'flex-end' },
  rowOvr: {
    ...type.metric,
    color: colors.text,
    fontSize: 22,
    lineHeight: 24,
  },
  rowOvrMuted: { ...type.h3, color: colors.textMute },
});
