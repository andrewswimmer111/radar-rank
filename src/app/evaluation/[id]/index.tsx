import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemRow } from '@/components/AddItemRow';
import { EvaluationSummary } from '@/components/EvaluationSummary';
import { HeaderBar } from '@/components/HeaderBar';
import { SortMenu } from '@/components/SortMenu';
import {
  createParticipant,
  deleteEvaluation,
  deleteParticipant,
  freezeEvaluation,
  refreshSubmissions,
  resumeEvaluation,
  shareEvaluation,
  updateEvaluation,
  updateParticipant,
  useCollection,
  useConsensus,
  useEvaluation,
  useEvaluationCategories,
  useParticipants,
  useScores,
  useShare,
  useSubmissionCount,
  useTemplate,
  type Participant,
} from '@/db/hooks';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import { consensusToFlatScores } from '@/lib/consensus';
import { confirmDestructive, showActionSheet } from '@/lib/dialog';
import { pickPersonColor } from '@/lib/personColors';
import {
  compareParticipantsBy,
  ovrByParticipant,
  rankAmong,
  spreadByParticipant,
  type SortMode,
} from '@/lib/stats';

// Vote-link host, set per build via env. Empty in dev/clones without a
// configured .env — sharing is guarded at the call sites below so the
// screen still works offline.
const VOTE_URL_BASE = process.env.EXPO_PUBLIC_VOTE_URL_BASE;

const voteUrl = (token: string) => `${VOTE_URL_BASE}/${token}`;

export default function EvaluationDetail() {
  const insets = useSafeAreaInsets();
  const { colors, name: themeName } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: evaluation, loading } = useEvaluation(id);
  const { data: participants } = useParticipants(id);
  const { data: categories } = useEvaluationCategories(id);
  const { data: scores } = useScores(id);
  const { data: share } = useShare(id);
  const { data: voteCount } = useSubmissionCount(id);
  const consensus = useConsensus(id);
  const isShared = !!share;
  const isFrozen = !!share?.frozenAt;
  const isActive = isShared && !isFrozen;
  const isStarter = id.startsWith('builtin-');
  const hasVotes = (voteCount ?? 0) > 0;
  // Tabs only appear once there's something to switch to. Default to
  // "yours" so the screen reads identically pre-share.
  const [tab, setTab] = useState<'yours' | 'consensus'>('yours');
  // Fall back to "yours" when consensus data goes away (full delete)
  // so we never leave the user looking at an empty consensus view.
  // Freezing intentionally keeps the cached votes around, so a frozen
  // share with hasVotes=true still lets the user stay on consensus.
  useEffect(() => {
    if (!hasVotes && tab === 'consensus') setTab('yours');
  }, [hasVotes, tab]);

  // Pull cached submissions on mount + whenever this evaluation's share
  // identity changes. Skip while frozen — no new submissions can arrive,
  // and a re-pull is just wasted bandwidth. Failures are non-fatal.
  useEffect(() => {
    if (!isActive) return;
    refreshSubmissions(id).catch(() => {});
  }, [id, share?.cloudId, isActive]);

  // Pull-to-refresh: re-pulls cached submissions on demand. Only meaningful
  // while sharing is active; on unshared/frozen evaluations the gesture
  // still flashes a spinner so the affordance feels alive, but there's
  // nothing to fetch.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      if (isActive) await refreshSubmissions(id);
    } catch {
      // Non-fatal: spinner just dismisses.
    } finally {
      setRefreshing(false);
    }
  };
  const { data: sourceCollection } = useCollection(
    evaluation?.originCollectionId ?? '',
  );
  const { data: sourceTemplate } = useTemplate(
    evaluation?.originTemplateId ?? '',
  );

  const [titleDraft, setTitleDraft] = useState('');
  useEffect(() => {
    if (evaluation) setTitleDraft(evaluation.title);
  }, [evaluation?.id, evaluation?.title]);

  // Mirror the latest draft / saved title / id into refs so the unmount
  // cleanup below can commit a pending edit without subscribing to those
  // values and re-running on every keystroke.
  const titleDraftRef = useRef(titleDraft);
  const savedTitleRef = useRef(evaluation?.title ?? '');
  const idRef = useRef(id);
  useEffect(() => {
    titleDraftRef.current = titleDraft;
  }, [titleDraft]);
  useEffect(() => {
    savedTitleRef.current = evaluation?.title ?? '';
  }, [evaluation?.title]);
  useEffect(() => {
    idRef.current = id;
  }, [id]);

  // Commit a pending title edit on unmount — covers back button, swipe-
  // back gesture, hardware back, and any other pop path. Fire-and-forget;
  // the DB write doesn't need the component to stay mounted.
  useEffect(() => {
    return () => {
      const draft = titleDraftRef.current.trim();
      const saved = savedTitleRef.current;
      if (draft && draft !== saved) {
        void updateEvaluation(idRef.current, { title: draft });
      }
    };
  }, []);

  const [newParticipantName, setNewParticipantName] = useState('');

  const [sortMode, setSortMode] = useState<SortMode>({ kind: 'manual' });
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSortMode({ kind: 'manual' });
    setSelectMode(false);
    setSelected(new Set());
  }, [id]);

  const enterSelectMode = () => {
    Haptics.selectionAsync().catch(() => {});
    setSelected(new Set());
    setSelectMode(true);
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const toggleSelect = (participantId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
        Haptics.selectionAsync().catch(() => {});
        return next;
      }
      if (next.size >= 3) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
        return prev;
      }
      next.add(participantId);
      Haptics.selectionAsync().catch(() => {});
      return next;
    });
  };
  const onCompare = () => {
    if (selected.size < 2) return;
    const idsParam = Array.from(selected).join(',');
    router.push(
      `/evaluation/${id}/compare?ids=${idsParam}&mode=${tab}`,
    );
  };

  const participantList = useMemo(() => participants ?? [], [participants]);
  const categoryKeys = useMemo(
    () => (categories ?? []).map((c) => c.key),
    [categories],
  );
  // Swap the underlying scores pool when the consensus tab is active.
  // Everything downstream (summary, sort keys, OVRs, ranks) runs the
  // same logic — only the source vector changes.
  const effectiveScores = useMemo(
    () =>
      tab === 'consensus'
        ? consensusToFlatScores(consensus, categoryKeys)
        : scores ?? [],
    [tab, consensus, categoryKeys, scores],
  );
  const ovrMap = useMemo(
    () => ovrByParticipant(effectiveScores, categoryKeys),
    [effectiveScores, categoryKeys],
  );
  const spreadMap = useMemo(
    () => spreadByParticipant(effectiveScores, categoryKeys),
    [effectiveScores, categoryKeys],
  );
  const scoreInCategoryMap = useMemo(() => {
    if (sortMode.kind !== 'strongestIn') return undefined;
    const target = sortMode.categoryKey;
    const out = new Map<string, number>();
    for (const s of effectiveScores) {
      if (s.categoryKey === target) out.set(s.participantId, s.value);
    }
    return out;
  }, [effectiveScores, sortMode]);

  const sortedParticipants = useMemo(() => {
    const comparator = compareParticipantsBy(sortMode, {
      ovrById: ovrMap,
      spreadById: spreadMap,
      scoreInCategoryById: scoreInCategoryMap,
    });
    return [...participantList].sort(comparator);
  }, [participantList, sortMode, ovrMap, spreadMap, scoreInCategoryMap]);

  const peerOvrs = useMemo(
    () =>
      participantList
        .filter((p) => !p.excluded)
        .map((p) => ovrMap.get(p.id) ?? 0),
    [participantList, ovrMap],
  );

  const activeCount = participantList.filter((p) => !p.excluded).length;
  const excludedCount = participantList.length - activeCount;

  if (loading && !evaluation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Evaluation" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  if (!evaluation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Evaluation" />
        <View style={styles.center}>
          <Text style={styles.muted}>Evaluation not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onTitleCommit = async () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(evaluation.title);
      return;
    }
    if (trimmed === evaluation.title) return;
    await updateEvaluation(id, { title: trimmed });
  };

  const onAddParticipant = async () => {
    const trimmed = newParticipantName.trim();
    if (!trimmed) return;
    await createParticipant({
      evaluationId: id,
      name: trimmed,
      color: pickPersonColor(participantList.length),
    });
    setNewParticipantName('');
  };

  const onDeleteEvaluation = () => {
    confirmDestructive({
      title: 'Delete this evaluation?',
      message:
        'Participants, categories, and scores are removed permanently.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteEvaluation(id);
        if (router.canGoBack()) router.back();
        else router.replace('/');
      },
    });
  };

  const onShare = () => {
    if (!VOTE_URL_BASE) {
      Alert.alert(
        "Sharing isn't set up yet",
        'The vote link host has not been configured for this build.',
      );
      return;
    }
    Alert.alert(
      'Share this evaluation?',
      "You won't be able to add or remove participants until you delete the evaluation. Scores and excluded toggles still work.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async () => {
            try {
              const created = await shareEvaluation(id);
              await Share.share({ message: voteUrl(created.voteToken) });
            } catch (err) {
              Alert.alert(
                'Could not share',
                err instanceof Error ? err.message : String(err),
              );
            }
          },
        },
      ],
    );
  };

  const onCopyLink = async () => {
    if (!share) return;
    if (!VOTE_URL_BASE) {
      Alert.alert(
        "Sharing isn't set up yet",
        'The vote link host has not been configured for this build.',
      );
      return;
    }
    await Clipboard.setStringAsync(voteUrl(share.voteToken));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  };

  const onPauseSharing = () => {
    Alert.alert(
      'Pause voting?',
      'The link will stop accepting new votes. Past votes stay in the Consensus tab. You can resume voting later from this menu.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause voting',
          onPress: async () => {
            try {
              await freezeEvaluation(id);
            } catch (err) {
              Alert.alert(
                'Could not pause voting',
                err instanceof Error ? err.message : String(err),
              );
            }
          },
        },
      ],
    );
  };

  const onResumeSharing = async () => {
    try {
      await resumeEvaluation(id);
    } catch (err) {
      Alert.alert(
        'Could not resume voting',
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const onOpenMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const deleteAction = {
      label: 'Delete evaluation',
      destructive: true,
      onPress: onDeleteEvaluation,
    };
    let actions: { label: string; destructive?: boolean; onPress: () => void }[];
    if (isFrozen) {
      actions = [
        { label: 'Copy link', onPress: () => void onCopyLink() },
        { label: 'Resume voting', onPress: () => void onResumeSharing() },
      ];
    } else if (isShared) {
      actions = [
        { label: 'Copy link', onPress: () => void onCopyLink() },
        { label: 'Pause voting', onPress: onPauseSharing },
      ];
    } else {
      actions = [{ label: 'Share evaluation', onPress: onShare }];
    }
    // Starters are read-only: they never expose pause/delete. Filter both
    // out after building the list above so the share/frozen branches stay
    // straightforward to read.
    if (isStarter) {
      actions = actions.filter((a) => a.label !== 'Pause voting');
    } else {
      actions.push(deleteAction);
    }
    showActionSheet({
      // Title only shows on Android (iOS sheet here intentionally has no
      // title to match the prior bare presentation).
      title: Platform.OS === 'android' ? evaluation?.title ?? 'Evaluation' : undefined,
      actions,
      themeName,
    });
  };

  const lineage = [sourceCollection?.name, sourceTemplate?.name]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar
        title="Evaluation"
        right={
          selectMode ? (
            <Pressable
              onPress={exitSelectMode}
              hitSlop={10}
              style={({ pressed: p }) => [
                styles.headerPill,
                p && pressed.default,
              ]}>
              <Text style={styles.headerPillText}>Cancel</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onOpenMenu}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="More options"
              style={({ pressed: p }) => [
                styles.menuBtn,
                p && pressed.default,
              ]}>
              <Text style={styles.menuBtnText}>⋯</Text>
            </Pressable>
          )
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom:
                insets.bottom + (selectMode ? 96 : spacing.xxl),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textDim}
            />
          }>
          <Text style={styles.eyebrow}>Title</Text>
          <TextInput
            style={styles.titleInput}
            value={titleDraft}
            // Multiline so long titles like "Friends × Athleticism" wrap
            // to a second line instead of clipping off the right edge.
            // Strip newlines so the keyboard's return key can't slip a
            // hard break into the stored title.
            onChangeText={(v) => setTitleDraft(v.replace(/\n/g, ''))}
            onBlur={onTitleCommit}
            onSubmitEditing={onTitleCommit}
            returnKeyType="done"
            maxLength={60}
            multiline
          />
          {lineage.length > 0 && (
            <Text style={styles.lineage}>From {lineage}</Text>
          )}

          {hasVotes && !selectMode && (
            <TabSwitch
              tab={tab}
              onChange={setTab}
              voteCount={voteCount ?? 0}
            />
          )}

          {hasVotes && !selectMode && tab === 'consensus' && (
            <Pressable
              onPress={() => router.push(`/evaluation/${id}/voters`)}
              accessibilityRole="button"
              accessibilityLabel="View voters and their score breakdowns"
              style={({ pressed: p }) => [
                styles.votersLink,
                p && pressed.soft,
              ]}>
              <Text style={styles.votersLinkText}>View voters</Text>
              <Text style={styles.votersLinkChevron}>›</Text>
            </Pressable>
          )}

          {!selectMode && (
            <EvaluationSummary
              // Re-key on tab so the summary remounts and replays its
              // entering animation each time the user switches between
              // Yours and Consensus — otherwise the FadeIn only runs the
              // first time this tab is visited.
              key={`summary-${tab}`}
              evaluationId={id}
              participants={participantList}
              categories={categories ?? []}
              scores={effectiveScores}
              mode={tab}
            />
          )}

          <View style={styles.participantsHeader}>
            <Text style={styles.eyebrow}>
              {selectMode ? 'Pick 2–3 to compare' : 'Participants'}
            </Text>
            <Text style={styles.participantsCount}>
              {selectMode
                ? `${selected.size} selected`
                : `${activeCount} active${
                    excludedCount > 0 ? ` · ${excludedCount} excluded` : ''
                  }`}
            </Text>
          </View>

          {!selectMode && participantList.length >= 2 && (
            <View style={styles.actionRow}>
              <SortMenu
                mode={sortMode}
                categories={categories ?? []}
                onChange={setSortMode}
              />
              <Pressable
                onPress={enterSelectMode}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Compare participants"
                style={({ pressed: p }) => [
                  styles.actionChip,
                  p && pressed.soft,
                ]}>
                <Text style={styles.actionChipText}>Compare</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.list}>
            {sortedParticipants.map((p, i) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                evaluationId={id}
                ovr={ovrMap.get(p.id) ?? 0}
                peerOvrs={peerOvrs}
                selectMode={selectMode}
                selected={selected.has(p.id)}
                onToggleSelect={toggleSelect}
                visibleIndex={i}
                shared={isShared}
              />
            ))}
            {participantList.length === 0 && (
              <View style={styles.listEmpty}>
                <Text style={styles.listEmptyText}>
                  Add a participant below to start scoring.
                </Text>
              </View>
            )}
          </View>

          {!selectMode && !isShared && (
            <AddItemRow
              value={newParticipantName}
              onChangeText={setNewParticipantName}
              onAdd={onAddParticipant}
              placeholder="Add a participant…"
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {selectMode && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          style={[
            styles.compareFooter,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}>
          <Pressable
            onPress={onCompare}
            disabled={selected.size < 2}
            style={({ pressed: p }) => [
              styles.compareBtn,
              selected.size < 2 && styles.compareBtnDisabled,
              p && selected.size >= 2 && pressed.default,
            ]}>
            <Text
              style={[
                styles.compareBtnText,
                selected.size < 2 && styles.compareBtnTextDisabled,
              ]}>
              {selected.size < 2
                ? `Select ${2 - selected.size} more`
                : `Compare ${selected.size} selected`}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const ParticipantRow = memo(function ParticipantRow({
  participant,
  evaluationId,
  ovr,
  peerOvrs,
  selectMode,
  selected,
  onToggleSelect,
  visibleIndex,
  shared,
}: {
  participant: Participant;
  evaluationId: string;
  ovr: number;
  peerOvrs: number[];
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  visibleIndex: number;
  shared: boolean;
}) {
  const { colors, name: themeName } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const onPress = () => {
    if (selectMode) {
      if (participant.excluded) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
        return;
      }
      onToggleSelect(participant.id);
      return;
    }
    router.push(`/evaluation/${evaluationId}/profile/${participant.id}`);
  };

  const totalPeers = peerOvrs.length;
  const rank = participant.excluded ? null : rankAmong(ovr, peerOvrs);

  const onToggleExcluded = () =>
    updateParticipant(participant.id, evaluationId, {
      excluded: !participant.excluded,
    });

  const onConfirmRemove = () =>
    confirmDestructive({
      title: `Remove ${participant.name}?`,
      message: 'All their scores will be deleted.',
      confirmLabel: 'Remove',
      onConfirm: () => deleteParticipant(participant.id, evaluationId),
    });

  const onLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const toggleLabel = participant.excluded ? 'Include' : 'Exclude';
    // Soft freeze: Remove is dropped from the menu while the evaluation
    // is shared, so the snapshot voters see can't shrink under them.
    const actions = shared
      ? [{ label: toggleLabel, onPress: onToggleExcluded }]
      : [
          { label: toggleLabel, onPress: onToggleExcluded },
          {
            label: 'Remove',
            destructive: true,
            onPress: onConfirmRemove,
          },
        ];
    showActionSheet({ title: participant.name, actions, themeName });
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={selectMode ? undefined : onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={
        selectMode
          ? `Select ${participant.name}`
          : `Open ${participant.name}'s profile`
      }
      accessibilityState={selectMode ? { selected } : undefined}
      style={({ pressed: p }) => [
        styles.row,
        participant.excluded && styles.rowExcluded,
        selectMode && selected && styles.rowSelected,
        p && pressed.default,
      ]}>
      {selectMode ? (
        <Animated.View
          entering={FadeIn.duration(180).delay(visibleIndex * 28)}
          style={[
            styles.checkbox,
            selected && styles.checkboxSelected,
            participant.excluded && styles.checkboxExcluded,
          ]}>
          {selected && <Text style={styles.checkboxMark}>✓</Text>}
        </Animated.View>
      ) : (
        <View
          style={[
            styles.colorChip,
            { backgroundColor: participant.color ?? colors.bgElev2 },
            participant.excluded && styles.colorChipExcluded,
          ]}>
          <Text style={styles.colorChipText}>
            {participant.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.rowMid}>
        <Text
          style={[styles.rowName, participant.excluded && styles.rowNameExcluded]}
          numberOfLines={2}>
          {participant.name}
        </Text>
        {participant.excluded && (
          <Text style={styles.rowExcludedTag}>Excluded</Text>
        )}
      </View>
      {participant.excluded ? (
        <Text style={styles.rowOvrMuted}>—</Text>
      ) : (
        <View style={styles.rowRight}>
          <Text style={styles.rowOvr}>{ovr}</Text>
          <Text style={styles.rowRank}>
            #{rank} of {totalPeers}
          </Text>
        </View>
      )}
      {!selectMode && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
});

// 4px padding around the bar + 4px gap between tabs — kept in sync with
// the tabBar style below so the sliding indicator lands exactly where a
// statically-active tab would render.
const TAB_BAR_PADDING = 4;
const TAB_GAP = 4;

function TabSwitch({
  tab,
  onChange,
  voteCount,
}: {
  tab: 'yours' | 'consensus';
  onChange: (next: 'yours' | 'consensus') => void;
  voteCount: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const [barWidth, setBarWidth] = useState(0);
  const innerWidth = Math.max(0, barWidth - TAB_BAR_PADDING * 2);
  const itemWidth = innerWidth > 0 ? (innerWidth - TAB_GAP) / 2 : 0;

  // Drive translateX directly as a shared value rather than animating a
  // 0..1 progress and multiplying by `itemWidth` inside the worklet —
  // closing over a JS number in useAnimatedStyle makes subsequent tab
  // switches snap instead of animate. Doing the math in the JS effect
  // keeps the worklet's only dependency the shared value itself.
  const translateX = useSharedValue(0);
  useEffect(() => {
    if (itemWidth === 0) return;
    const target = tab === 'yours' ? 0 : itemWidth + TAB_GAP;
    translateX.value = withTiming(target, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [tab, itemWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const labelFor = (t: 'yours' | 'consensus') =>
    t === 'yours' ? 'Yours' : `Consensus · ${voteCount}`;
  return (
    <View
      style={styles.tabBar}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist">
      {itemWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabIndicator,
            { width: itemWidth },
            indicatorStyle,
          ]}
        />
      )}
      {(['yours', 'consensus'] as const).map((t) => {
        const active = tab === t;
        return (
          <Pressable
            key={t}
            onPress={() => {
              if (!active) {
                Haptics.selectionAsync().catch(() => {});
                onChange(t);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={labelFor(t)}
            style={({ pressed: p }) => [
              styles.tabBtn,
              p && !active && pressed.default,
            ]}>
            <Text
              style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
              {labelFor(t)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: t.colors.textDim },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bgElev,
  },
  menuBtnText: { ...type.h2, color: t.colors.text, lineHeight: 22 },
  headerPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: t.colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  headerPillText: { ...type.label, color: t.colors.text },
  checkbox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bgElev2,
    borderWidth: 1.5,
    borderColor: t.colors.border,
  },
  checkboxSelected: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  checkboxExcluded: { opacity: 0.5 },
  checkboxMark: { ...type.h3, color: t.colors.onAccent, lineHeight: 20 },
  rowSelected: {
    borderColor: t.colors.accent,
    backgroundColor: t.colors.bgElev2,
  },
  compareFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: t.colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
  },
  compareBtn: {
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accent,
    minHeight: 48,
  },
  compareBtnDisabled: { backgroundColor: t.colors.bgElev2 },
  compareBtnText: { ...type.h3, color: t.colors.onAccent },
  compareBtnTextDisabled: { color: t.colors.textMute },
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
  titleInput: {
    ...type.hero,
    color: t.colors.text,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    textAlignVertical: 'top',
  },
  lineage: {
    ...type.caption,
    color: t.colors.textMute,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xl,
  },
  participantsCount: { ...type.caption, color: t.colors.textMute },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: t.colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  actionChipText: { ...type.label, color: t.colors.text },
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
  rowExcluded: { opacity: 0.5 },
  tabBar: {
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: t.colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    gap: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radii.pill,
    backgroundColor: t.colors.accent,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: { ...type.label, color: t.colors.textDim },
  tabBtnTextActive: { color: t.colors.onAccent },
  votersLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: t.colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  votersLinkText: { ...type.label, color: t.colors.text },
  votersLinkChevron: { ...type.h3, color: t.colors.textMute },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipExcluded: { backgroundColor: t.colors.bgElev2 },
  colorChipText: { ...type.h3, color: '#fff' },
  rowMid: { flex: 1, gap: 2 },
  rowName: { ...type.h3, color: t.colors.text },
  rowNameExcluded: { color: t.colors.textDim },
  rowExcludedTag: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
  },
  rowRight: { alignItems: 'flex-end' },
  rowOvr: { ...type.metric, color: t.colors.text, fontSize: 22, lineHeight: 24 },
  rowRank: { ...type.caption, color: t.colors.textDim, marginTop: 2 },
  rowOvrMuted: { ...type.h3, color: t.colors.textMute },
  chevron: { ...type.h2, color: t.colors.textMute, marginLeft: spacing.xs },
});
