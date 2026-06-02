import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
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

const isStarter = (id: string) => id.startsWith('builtin-');

export default function EvaluationsTab() {
  const { data } = useEvaluations();
  const all = data ?? [];
  const starters = all.filter((e) => isStarter(e.id));
  const yours = all.filter((e) => !isStarter(e.id));

  return (
    <TabScreen>
      <TabHeader title="Evaluations" />
      <TabContent gap={spacing.xxl}>
        <Section title="Yours" caption="Rankings you've started.">
          <NewEvaluationCta />
          {yours.map((e, i) => (
            <EvaluationRow key={e.id} evaluation={e} index={i} />
          ))}
        </Section>

        {starters.length > 0 && (
          <Section
            title="Starters"
            caption="A sample ranking to explore."
          >
            {starters.map((e, i) => (
              <EvaluationRow
                key={e.id}
                evaluation={e}
                index={yours.length + i}
              />
            ))}
          </Section>
        )}
      </TabContent>
    </TabScreen>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCaption}>{caption}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
  section: { gap: spacing.md },
  sectionHeader: { gap: 4 },
  sectionTitle: {
    ...type.eyebrow,
    color: t.colors.accent,
    textTransform: 'uppercase',
  },
  sectionCaption: { ...type.caption, color: t.colors.textMute },
  sectionBody: { gap: spacing.md },
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
