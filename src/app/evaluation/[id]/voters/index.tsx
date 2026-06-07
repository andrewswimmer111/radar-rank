import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SwipeRow } from '@/components/SwipeRow';
import {
  deleteVoteSubmission,
  renameVoteSubmission,
  useConsensus,
  useEvaluation,
  useEvaluationCategories,
  useParticipants,
  useVoteScores,
  useVoteSubmissions,
  type VoteScore,
  type VoteSubmission,
} from '@/db/hooks';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import type { ConsensusMap } from '@/lib/consensus';
import { confirmDestructive } from '@/lib/dialog';
import { timeAgo } from '@/lib/timeAgo';

// Mean absolute deviation of this voter's scores against the consensus
// mean. Only cells where consensus has a stat *and* the voter submitted
// a value count toward the average; if there are no overlapping cells
// (shouldn't happen given the submit_vote RPC writes every category),
// returns null and the chip shows "—".
function meanAbsDeviation(
  scoresForVoter: VoteScore[],
  consensus: ConsensusMap | null,
  activeParticipantIds: Set<string>,
): number | null {
  if (!consensus) return null;
  let sum = 0;
  let n = 0;
  for (const s of scoresForVoter) {
    if (!activeParticipantIds.has(s.participantId)) continue;
    const stat = consensus.get(s.participantId)?.get(s.categoryKey);
    if (!stat) continue;
    sum += Math.abs(s.value - stat.mean);
    n += 1;
  }
  if (n === 0) return null;
  return sum / n;
}

export default function VotersListScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: evaluation, loading } = useEvaluation(id);
  const { data: submissions } = useVoteSubmissions(id);
  const { data: voteScores } = useVoteScores(id);
  const { data: participants } = useParticipants(id);
  const { data: categories } = useEvaluationCategories(id);
  const consensus = useConsensus(id);

  const activeParticipantIds = useMemo(
    () => new Set((participants ?? []).filter((p) => !p.excluded).map((p) => p.id)),
    [participants],
  );

  // Bucket scores by submission so the per-row stat is O(scores) for the
  // whole list, not O(scores) per row.
  const scoresBySubmission = useMemo(() => {
    const m = new Map<string, VoteScore[]>();
    for (const s of voteScores ?? []) {
      let arr = m.get(s.submissionId);
      if (!arr) {
        arr = [];
        m.set(s.submissionId, arr);
      }
      arr.push(s);
    }
    return m;
  }, [voteScores]);

  const [renamingId, setRenamingId] = useState<string | null>(null);

  const onDelete = (sub: VoteSubmission) => {
    confirmDestructive({
      title: `Delete ${sub.voterName}'s vote?`,
      message: "Their scores are removed from the consensus. This can't be undone.",
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteVoteSubmission(id, sub.id);
        } catch (err) {
          Alert.alert(
            'Could not delete vote',
            err instanceof Error ? err.message : String(err),
          );
        }
      },
    });
  };

  if (loading && !evaluation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Voters" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  const list = submissions ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="Voters" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>
            {list.length} {list.length === 1 ? 'voter' : 'voters'}
          </Text>
          <Text style={styles.subhead}>
            Swipe a row to rename or delete. Tap to see their full breakdown
            against the group.
          </Text>

          <View style={styles.list}>
            {list.map((sub) => (
              <VoterRow
                key={sub.id}
                evaluationId={id}
                submission={sub}
                renaming={renamingId === sub.id}
                onStartRename={() => setRenamingId(sub.id)}
                onCancelRename={() => setRenamingId(null)}
                onCommitRename={async (name) => {
                  setRenamingId(null);
                  if (!name.trim() || name.trim() === sub.voterName) return;
                  try {
                    await renameVoteSubmission(id, sub.id, name);
                  } catch (err) {
                    Alert.alert(
                      'Could not rename',
                      err instanceof Error ? err.message : String(err),
                    );
                  }
                }}
                onDelete={() => onDelete(sub)}
                deviation={meanAbsDeviation(
                  scoresBySubmission.get(sub.id) ?? [],
                  consensus,
                  activeParticipantIds,
                )}
                hasCategories={(categories ?? []).length > 0}
              />
            ))}
            {list.length === 0 && (
              <View style={styles.listEmpty}>
                <Text style={styles.listEmptyText}>
                  No one has voted yet. Share the link to collect votes.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function VoterRow({
  evaluationId,
  submission,
  renaming,
  onStartRename,
  onCancelRename,
  onCommitRename,
  onDelete,
  deviation,
  hasCategories,
}: {
  evaluationId: string;
  submission: VoteSubmission;
  renaming: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  onCommitRename: (name: string) => void;
  onDelete: () => void;
  deviation: number | null;
  hasCategories: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const [draft, setDraft] = useState(submission.voterName);
  const inputRef = useRef<TextInput>(null);
  // Cancel and blur fire in close succession when the user taps Cancel
  // while the input is focused. Without this flag, blur would still
  // commit whatever's in `draft`, overriding the explicit cancel.
  const cancelledRef = useRef(false);

  const onPress = () => {
    if (renaming) return;
    Haptics.selectionAsync().catch(() => {});
    router.push(`/evaluation/${evaluationId}/voters/${submission.id}`);
  };

  return (
    <SwipeRow
      id={submission.id}
      onDelete={onDelete}
      leftAction={{
        label: 'Rename',
        onPress: () => {
          setDraft(submission.voterName);
          onStartRename();
          // The TextInput is mounted after this render; defer focus.
          requestAnimationFrame(() => inputRef.current?.focus());
        },
      }}>
      <Pressable
        onPress={onPress}
        disabled={renaming}
        accessibilityRole="button"
        accessibilityLabel={`Open ${submission.voterName}'s vote breakdown`}
        style={({ pressed: p }) => [styles.row, p && pressed.default]}>
        <View style={styles.rowMid}>
          {renaming ? (
            <TextInput
              ref={inputRef}
              style={styles.renameInput}
              value={draft}
              onChangeText={(v) => setDraft(v.replace(/\n/g, ''))}
              onBlur={() => {
                if (cancelledRef.current) {
                  cancelledRef.current = false;
                  return;
                }
                onCommitRename(draft);
              }}
              onSubmitEditing={() => onCommitRename(draft)}
              returnKeyType="done"
              maxLength={60}
              autoFocus
              selectTextOnFocus
              accessibilityLabel="Voter name"
            />
          ) : (
            <Text style={styles.rowName} numberOfLines={1}>
              {submission.voterName}
            </Text>
          )}
          <Text style={styles.rowMeta}>{timeAgo(submission.submittedAt)}</Text>
        </View>
        {!renaming && (
          <View style={styles.rowRight}>
            {hasCategories && deviation !== null ? (
              <>
                <Text style={styles.rowMetric}>Δ {Math.round(deviation)}</Text>
                <Text style={styles.rowMetricLabel}>vs avg</Text>
              </>
            ) : (
              <Text style={styles.rowMetricMute}>—</Text>
            )}
          </View>
        )}
        {renaming ? (
          <Pressable
            onPress={() => {
              cancelledRef.current = true;
              onCancelRename();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cancel rename"
            style={({ pressed: p }) => [
              styles.cancelBtn,
              p && pressed.default,
            ]}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </Pressable>
    </SwipeRow>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  subhead: {
    ...type.caption,
    color: t.colors.textDim,
    paddingHorizontal: spacing.xs,
  },
  list: { marginTop: spacing.sm, gap: spacing.sm },
  listEmpty: {
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  listEmptyText: {
    ...type.body,
    color: t.colors.textDim,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    gap: spacing.md,
    minHeight: 64,
  },
  rowMid: { flex: 1, gap: 2 },
  rowName: { ...type.h3, color: t.colors.text },
  rowMeta: { ...type.caption, color: t.colors.textMute },
  rowRight: { alignItems: 'flex-end' },
  rowMetric: { ...type.metric, color: t.colors.text, fontSize: 22, lineHeight: 24 },
  rowMetricLabel: { ...type.caption, color: t.colors.textDim, marginTop: 2 },
  rowMetricMute: { ...type.h3, color: t.colors.textMute },
  chevron: { ...type.h2, color: t.colors.textMute, marginLeft: spacing.xs },
  renameInput: {
    ...type.h3,
    color: t.colors.text,
    backgroundColor: t.colors.bgElev2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: t.colors.bgElev2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  cancelBtnText: { ...type.label, color: t.colors.text },
});
