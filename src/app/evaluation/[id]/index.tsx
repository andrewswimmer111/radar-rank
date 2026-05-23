import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
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

import { EvaluationSummary } from '@/components/EvaluationSummary';
import { HeaderBar } from '@/components/HeaderBar';
import {
  createParticipant,
  deleteEvaluation,
  deleteParticipant,
  updateEvaluation,
  updateParticipant,
  useCollection,
  useEvaluation,
  useEvaluationCategories,
  useParticipants,
  useScores,
  useTemplate,
  type Participant,
} from '@/db/hooks';
import { colors, radii, spacing, type } from '@/design/tokens';
import { pickPersonColor } from '@/lib/personColors';
import { ovrByParticipant, rankAmong } from '@/lib/stats';

export default function EvaluationDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: evaluation, loading } = useEvaluation(id);
  const { data: participants } = useParticipants(id);
  const { data: categories } = useEvaluationCategories(id);
  const { data: scores } = useScores(id);
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

  const [newParticipantName, setNewParticipantName] = useState('');

  const participantList = participants ?? [];
  const categoryKeys = useMemo(
    () => (categories ?? []).map((c) => c.key),
    [categories],
  );
  const ovrMap = useMemo(
    () => ovrByParticipant(scores ?? [], categoryKeys),
    [scores, categoryKeys],
  );
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

  const lineage = [sourceCollection?.name, sourceTemplate?.name]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar
        title="Evaluation"
        right={
          <Pressable
            onPress={onDeleteEvaluation}
            hitSlop={10}
            style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]}>
            <Text style={styles.menuBtnText}>⋯</Text>
          </Pressable>
        }
      />
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
          <Text style={styles.eyebrow}>Title</Text>
          <TextInput
            style={styles.titleInput}
            value={titleDraft}
            onChangeText={setTitleDraft}
            onBlur={onTitleCommit}
            onSubmitEditing={onTitleCommit}
            returnKeyType="done"
            maxLength={60}
          />
          {lineage.length > 0 && (
            <Text style={styles.lineage}>From {lineage}</Text>
          )}

          <EvaluationSummary
            participants={participantList}
            categories={categories ?? []}
            scores={scores ?? []}
          />

          <View style={styles.participantsHeader}>
            <Text style={styles.eyebrow}>Participants</Text>
            <Text style={styles.participantsCount}>
              {activeCount} active
              {excludedCount > 0 ? ` · ${excludedCount} excluded` : ''}
            </Text>
          </View>

          <View style={styles.list}>
            {participantList.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                evaluationId={id}
                ovr={ovrMap.get(p.id) ?? 0}
                peerOvrs={peerOvrs}
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

          <View style={styles.addRow}>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ParticipantRow({
  participant,
  evaluationId,
  ovr,
  peerOvrs,
}: {
  participant: Participant;
  evaluationId: string;
  ovr: number;
  peerOvrs: number[];
}) {
  const onPress = () =>
    router.push(`/evaluation/${evaluationId}/profile/${participant.id}`);

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
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: participant.name,
          options: [toggleLabel, 'Remove', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          userInterfaceStyle: 'dark',
        },
        (index) => {
          if (index === 0) onToggleExcluded();
          else if (index === 1) onConfirmRemove();
        },
      );
    } else {
      Alert.alert(participant.name, undefined, [
        { text: toggleLabel, onPress: onToggleExcluded },
        { text: 'Remove', style: 'destructive', onPress: onConfirmRemove },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        participant.excluded && styles.rowExcluded,
        pressed && styles.pressed,
      ]}>
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
      <View style={styles.rowMid}>
        <Text
          style={[styles.rowName, participant.excluded && styles.rowNameExcluded]}
          numberOfLines={1}>
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
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: colors.textDim },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElev,
  },
  menuBtnText: { ...type.h2, color: colors.text, lineHeight: 22 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  titleInput: {
    ...type.hero,
    color: colors.text,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  lineage: {
    ...type.caption,
    color: colors.textMute,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xl,
  },
  participantsCount: { ...type.caption, color: colors.textMute },
  list: { marginTop: spacing.sm, gap: spacing.sm },
  listEmpty: {
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  listEmptyText: {
    ...type.body,
    color: colors.textDim,
    textAlign: 'center',
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
  rowExcluded: { opacity: 0.5 },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipExcluded: { backgroundColor: colors.bgElev2 },
  colorChipText: { ...type.h3, color: '#fff' },
  rowMid: { flex: 1, gap: 2 },
  rowName: { ...type.h3, color: colors.text },
  rowNameExcluded: { color: colors.textDim },
  rowExcludedTag: {
    ...type.eyebrow,
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  rowRight: { alignItems: 'flex-end' },
  rowOvr: { ...type.metric, color: colors.text, fontSize: 22, lineHeight: 24 },
  rowRank: { ...type.caption, color: colors.textDim, marginTop: 2 },
  rowOvrMuted: { ...type.h3, color: colors.textMute },
  chevron: { ...type.h2, color: colors.textMute, marginLeft: spacing.xs },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  addInput: {
    ...type.body,
    flex: 1,
    color: colors.text,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  addBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  addBtnDisabled: { backgroundColor: colors.bgElev2 },
  addBtnText: { ...type.h3, color: colors.bg },
  addBtnTextDisabled: { color: colors.textMute },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
