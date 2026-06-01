import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { memo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import {
  TabBareTopBar,
  TabContent,
  TabHeader,
  TabScreen,
} from '@/components/TabScreen';
import {
  useEvaluations,
  useParticipants,
  type Evaluation,
} from '@/db/hooks';
import { useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import { timeAgo } from '@/lib/timeAgo';

export default function EvaluationsTab() {
  const { data } = useEvaluations();
  const evaluations = data ?? [];

  if (evaluations.length === 0) {
    return (
      <TabScreen>
        <TabBareTopBar />
        <EmptyState
          icon="chart.dots.scatter"
          eyebrow="Evaluations"
          headline="Make your first ranking."
          body="Combine a collection with a template to create a working evaluation space."
          ctaLabel="Create your first evaluation"
          onCtaPress={() => router.push('/evaluation/new')}
        />
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <TabHeader
        title="Evaluations"
        onNewPress={() => router.push('/evaluation/new')}
      />
      <TabContent>
        {evaluations.map((e, i) => (
          <EvaluationRow key={e.id} evaluation={e} index={i} />
        ))}
      </TabContent>
    </TabScreen>
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
  chevron: { ...type.h2, color: t.colors.textMute },
});
