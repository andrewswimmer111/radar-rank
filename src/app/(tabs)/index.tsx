import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SwipeRow } from '@/components/SwipeRow';
import {
  Section,
  TabContent,
  TabHeader,
  TabScreen,
} from '@/components/TabScreen';
import {
  deleteEvaluation,
  useEvaluations,
  useParticipants,
  type Evaluation,
} from '@/db/hooks';
import { useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import { confirmDestructive } from '@/lib/dialog';
import { useStarterPrefs } from '@/lib/starterPrefs';
import { timeAgo } from '@/lib/timeAgo';

const isStarter = (id: string) => id.startsWith('builtin-');

const confirmDeleteEvaluation = (id: string, title: string) =>
  confirmDestructive({
    title: `Delete ${title}?`,
    message:
      'Participants, categories, and scores are removed permanently.',
    confirmLabel: 'Delete',
    onConfirm: () => deleteEvaluation(id),
  });

const sortPinnedFirst =
  (pinned: ReadonlySet<string>) =>
  (a: { id: string }, b: { id: string }) =>
    Number(pinned.has(b.id)) - Number(pinned.has(a.id));

export default function EvaluationsTab() {
  const { data } = useEvaluations();
  const { hidden, pinned, hiddenTabs, hideTab } = useStarterPrefs();
  const all = data ?? [];
  const yours = all
    .filter((e) => !isStarter(e.id))
    .sort(sortPinnedFirst(pinned));
  const starters = all
    .filter((e) => isStarter(e.id) && !hidden.has(e.id))
    .sort(sortPinnedFirst(pinned));
  const showStarters = !hiddenTabs.has('evaluations') && starters.length > 0;

  return (
    <TabScreen>
      <TabHeader title="Evaluations" />
      <TabContent gap={spacing.xxl}>
        <Section title="Yours" caption="Rankings you've started.">
          <NewEvaluationCta />
          {yours.map((e, i) => (
            <SwipeRow
              key={e.id}
              id={e.id}
              onDelete={() => confirmDeleteEvaluation(e.id, e.title)}>
              <EvaluationRow evaluation={e} index={i} />
            </SwipeRow>
          ))}
        </Section>

        {showStarters && (
          <Section
            title="Starters"
            caption="A sample ranking to explore."
            onHide={() => hideTab('evaluations')}
          >
            {starters.map((e, i) => (
              <SwipeRow key={e.id} id={e.id}>
                <EvaluationRow
                  evaluation={e}
                  index={yours.length + i}
                />
              </SwipeRow>
            ))}
          </Section>
        )}
      </TabContent>
    </TabScreen>
  );
}

function NewEvaluationCta() {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => router.push('/evaluation/new')}
      accessibilityRole="button"
      accessibilityLabel="Start a new evaluation"
      style={({ pressed: p }) => [styles.ctaBlock, p && pressed.default]}>
      <Text style={styles.ctaText}>
        <Text style={styles.ctaAccent}>+ </Text>Start a new evaluation
      </Text>
    </Pressable>
  );
}

const EvaluationRow = memo(function EvaluationRow({
  evaluation,
  index,
}: {
  evaluation: Evaluation;
  index: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const { data: participants } = useParticipants(evaluation.id);
  const { pinned } = useStarterPrefs();
  const isPinned = pinned.has(evaluation.id);

  const total = participants?.length ?? 0;
  const active = participants?.filter((p) => !p.excluded).length ?? total;
  const subtitle = `${active} ${active === 1 ? 'person' : 'people'} · ${timeAgo(evaluation.updatedAt)}`;

  return (
    <Animated.View entering={FadeInDown.duration(360).delay(60 + index * 30)}>
      <Pressable
        onPress={() => router.push(`/evaluation/${evaluation.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${evaluation.title}`}
        style={({ pressed: p }) => [styles.row, p && pressed.default]}>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {evaluation.title}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {isPinned && <View style={styles.pinDot} />}
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Animated.View>
  );
});

const makeStyles = (t: Theme) => StyleSheet.create({
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
    minHeight: 72,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...type.h3, color: t.colors.text },
  rowSubtitle: { ...type.caption, color: t.colors.textDim },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.accent,
  },
  chevron: { ...type.h2, color: t.colors.textMute },
  ctaBlock: {
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  ctaText: {
    ...type.body,
    color: t.colors.textDim,
    textAlign: 'center',
  },
  ctaAccent: { color: t.colors.accent },
});
