import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EvaluationSummary } from '@/components/EvaluationSummary';
import { HeaderBar } from '@/components/HeaderBar';
import { SortMenu } from '@/components/SortMenu';
import {
  createParticipant,
  deleteEvaluation,
  deleteParticipant,
  refreshSubmissions,
  shareEvaluation,
  unshareEvaluation,
  updateEvaluation,
  updateParticipant,
  useCollection,
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
import { radii, spacing, type } from '@/design/tokens';
import { CONSENSUS_ID } from '@/lib/consensus';
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
  const isShared = !!share;

  // Pull cached submissions on mount + whenever this evaluation's share
  // identity changes (e.g. unshare → reshare rotates cloudId). Failures
  // are non-fatal — the screen still works against whatever's cached.
  useEffect(() => {
    if (!share) return;
    refreshSubmissions(id).catch(() => {});
  }, [id, share?.cloudId]);
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
    router.push(`/evaluation/${id}/compare?ids=${idsParam}`);
  };

  const participantList = useMemo(() => participants ?? [], [participants]);
  const categoryKeys = useMemo(
    () => (categories ?? []).map((c) => c.key),
    [categories],
  );
  const ovrMap = useMemo(
    () => ovrByParticipant(scores ?? [], categoryKeys),
    [scores, categoryKeys],
  );
  const spreadMap = useMemo(
    () => spreadByParticipant(scores ?? [], categoryKeys),
    [scores, categoryKeys],
  );
  const scoreInCategoryMap = useMemo(() => {
    if (sortMode.kind !== 'strongestIn') return undefined;
    const target = sortMode.categoryKey;
    const out = new Map<string, number>();
    for (const s of scores ?? []) {
      if (s.categoryKey === target) out.set(s.participantId, s.value);
    }
    return out;
  }, [scores, sortMode]);

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
    Alert.alert(
      'Delete this evaluation?',
      'Participants, categories, and scores are removed permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEvaluation(id);
            if (router.canGoBack()) router.back();
            else router.replace('/');
          },
        },
      ],
    );
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
      "You won't be able to add or remove participants until you unshare. Scores and excluded toggles still work.",
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

  const onUnshare = () => {
    Alert.alert(
      'Unshare this evaluation?',
      'The share link will stop working and any submitted votes will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unshare',
          style: 'destructive',
          onPress: async () => {
            try {
              await unshareEvaluation(id);
            } catch (err) {
              Alert.alert(
                'Could not unshare',
                err instanceof Error ? err.message : String(err),
              );
            }
          },
        },
      ],
    );
  };

  const onOpenMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const options = isShared
      ? ['Copy link', 'Unshare', 'Delete evaluation', 'Cancel']
      : ['Share evaluation', 'Delete evaluation', 'Cancel'];
    const destructiveButtonIndex = isShared ? 2 : 1;
    const cancelButtonIndex = options.length - 1;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
          userInterfaceStyle: themeName,
        },
        (index) => {
          if (isShared) {
            if (index === 0) void onCopyLink();
            else if (index === 1) onUnshare();
            else if (index === 2) onDeleteEvaluation();
          } else {
            if (index === 0) onShare();
            else if (index === 1) onDeleteEvaluation();
          }
        },
      );
    } else {
      const buttons = isShared
        ? [
            { text: 'Copy link', onPress: () => void onCopyLink() },
            { text: 'Unshare', style: 'destructive' as const, onPress: onUnshare },
            { text: 'Delete evaluation', style: 'destructive' as const, onPress: onDeleteEvaluation },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        : [
            { text: 'Share evaluation', onPress: onShare },
            { text: 'Delete evaluation', style: 'destructive' as const, onPress: onDeleteEvaluation },
            { text: 'Cancel', style: 'cancel' as const },
          ];
      Alert.alert(evaluation?.title ?? 'Evaluation', undefined, buttons);
    }
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
              style={({ pressed }) => [
                styles.headerPill,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.headerPillText}>Cancel</Text>
            </Pressable>
          ) : (
            <>
              {participantList.length >= 2 && (
                <Pressable
                  onPress={enterSelectMode}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.headerPill,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={styles.headerPillText}>Compare</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onOpenMenu}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="More options"
                style={({ pressed }) => [
                  styles.menuBtn,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.menuBtnText}>⋯</Text>
              </Pressable>
            </>
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
          showsVerticalScrollIndicator={false}>
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

          {isShared && !selectMode && (
            <Pressable
              onPress={onOpenMenu}
              hitSlop={6}
              style={({ pressed }) => [
                styles.shareStatusRow,
                pressed && styles.pressed,
              ]}>
              <View style={styles.shareStatusDot} />
              <Text style={styles.shareStatusText}>
                Shared · {voteCount ?? 0}{' '}
                {voteCount === 1 ? 'vote' : 'votes'}
              </Text>
              <Text style={styles.shareStatusChevron}>›</Text>
            </Pressable>
          )}

          {!selectMode && (
            <EvaluationSummary
              evaluationId={id}
              participants={participantList}
              categories={categories ?? []}
              scores={scores ?? []}
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
            <SortMenu
              mode={sortMode}
              categories={categories ?? []}
              onChange={setSortMode}
            />
          )}

          <View style={styles.list}>
            {(voteCount ?? 0) > 0 && (
              <ConsensusRow
                evaluationId={id}
                voteCount={voteCount ?? 0}
                selectMode={selectMode}
                selected={selected.has(CONSENSUS_ID)}
                onToggleSelect={toggleSelect}
              />
            )}
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

          {!selectMode && !isShared && <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newParticipantName}
              onChangeText={setNewParticipantName}
              placeholder="Add a participant…"
              placeholderTextColor={colors.textMute}
              returnKeyType="done"
              autoCapitalize="words"
              autoCorrect={false}
              onSubmitEditing={onAddParticipant}
              maxLength={40}
            />
            <Pressable
              onPress={onAddParticipant}
              disabled={!newParticipantName.trim()}
              style={({ pressed }) => [
                styles.addBtn,
                !newParticipantName.trim() && styles.addBtnDisabled,
                pressed && newParticipantName.trim() && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.addBtnText,
                  !newParticipantName.trim() && styles.addBtnTextDisabled,
                ]}>
                Add
              </Text>
            </Pressable>
          </View>}
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
            style={({ pressed }) => [
              styles.compareBtn,
              selected.size < 2 && styles.compareBtnDisabled,
              pressed && selected.size >= 2 && styles.pressed,
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
    Alert.alert(
      `Remove ${participant.name}?`,
      'All their scores will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteParticipant(participant.id, evaluationId),
        },
      ],
    );

  const onLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const toggleLabel = participant.excluded ? 'Include' : 'Exclude';
    // Soft freeze: Remove is dropped from the menu while the evaluation
    // is shared, so the snapshot voters see can't shrink under them.
    const iosOptions = shared
      ? [toggleLabel, 'Cancel']
      : [toggleLabel, 'Remove', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: participant.name,
          options: iosOptions,
          destructiveButtonIndex: shared ? undefined : 1,
          cancelButtonIndex: iosOptions.length - 1,
          userInterfaceStyle: themeName,
        },
        (index) => {
          if (index === 0) onToggleExcluded();
          else if (!shared && index === 1) onConfirmRemove();
        },
      );
    } else {
      const buttons = shared
        ? [
            { text: toggleLabel, onPress: onToggleExcluded },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        : [
            { text: toggleLabel, onPress: onToggleExcluded },
            {
              text: 'Remove',
              style: 'destructive' as const,
              onPress: onConfirmRemove,
            },
            { text: 'Cancel', style: 'cancel' as const },
          ];
      Alert.alert(participant.name, undefined, buttons);
    }
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
      style={({ pressed }) => [
        styles.row,
        participant.excluded && styles.rowExcluded,
        selectMode && selected && styles.rowSelected,
        pressed && styles.pressed,
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

const ConsensusRow = memo(function ConsensusRow({
  evaluationId,
  voteCount,
  selectMode,
  selected,
  onToggleSelect,
}: {
  evaluationId: string;
  voteCount: number;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const onPress = () => {
    if (selectMode) {
      onToggleSelect(CONSENSUS_ID);
      return;
    }
    router.push(`/evaluation/${evaluationId}/consensus`);
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        selectMode ? 'Select Consensus' : 'Open Consensus details'
      }
      accessibilityState={selectMode ? { selected } : undefined}
      style={({ pressed }) => [
        styles.row,
        styles.consensusRow,
        selectMode && selected && styles.rowSelected,
        pressed && styles.pressed,
      ]}>
      {selectMode ? (
        <View
          style={[
            styles.checkbox,
            selected && styles.checkboxSelected,
          ]}>
          {selected && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
      ) : (
        <View style={styles.consensusBadge} />
      )}
      <View style={styles.rowMid}>
        <Text style={styles.rowName}>Consensus</Text>
        <Text style={styles.consensusSubtitle}>
          From {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
        </Text>
      </View>
      {!selectMode && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
});

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
  shareStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: t.colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.accent,
    gap: spacing.sm,
  },
  shareStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.accent,
  },
  shareStatusText: {
    ...type.label,
    color: t.colors.text,
    flex: 1,
  },
  shareStatusChevron: {
    ...type.h3,
    color: t.colors.textMute,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xl,
  },
  participantsCount: { ...type.caption, color: t.colors.textMute },
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
  consensusRow: {
    backgroundColor: 'transparent',
    borderColor: t.colors.accent,
    borderWidth: 1.5,
  },
  consensusBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: t.colors.accent,
  },
  consensusSubtitle: {
    ...type.eyebrow,
    color: t.colors.accent,
    textTransform: 'uppercase',
  },
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
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  addInput: {
    ...type.body,
    flex: 1,
    color: t.colors.text,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  addBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: t.colors.accent,
  },
  addBtnDisabled: { backgroundColor: t.colors.bgElev2 },
  addBtnText: { ...type.h3, color: t.colors.onAccent },
  addBtnTextDisabled: { color: t.colors.textMute },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
