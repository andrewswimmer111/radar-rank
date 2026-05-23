import {
  Canvas,
  Group,
  LinearGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { RadarChart, type RadarSeries } from '@/components/RadarChart';
import {
  useEvaluation,
  useEvaluationCategories,
  useParticipants,
  useScores,
  type Participant,
} from '@/db/hooks';
import { colors, radii, shadows, spacing, type } from '@/design/tokens';
import { pickPersonColor } from '@/lib/personColors';
import { gradeFromScore } from '@/lib/stats';

const LOGICAL = 1080;
const CENTER = { x: 540, y: 540 };
const RADIUS = 340;

type Selected = { participant: Participant; paletteIndex: number };

export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();
  const { id, ids } = useLocalSearchParams<{ id: string; ids?: string }>();

  const { data: evaluation } = useEvaluation(id);
  const { data: participants } = useParticipants(id);
  const { data: categories } = useEvaluationCategories(id);
  const { data: scoresFlat } = useScores(id);

  const selectedIds = useMemo(() => parseIds(ids), [ids]);

  const selected = useMemo<Selected[] | null>(() => {
    if (!participants) return null;
    const byId = new Map(participants.map((p) => [p.id, p]));
    const out: Selected[] = [];
    selectedIds.forEach((pid, i) => {
      const p = byId.get(pid);
      if (p) out.push({ participant: p, paletteIndex: i });
    });
    return out;
  }, [participants, selectedIds]);

  const scoresByParticipant = useMemo(() => {
    const out = new Map<string, Record<string, number>>();
    for (const s of scoresFlat ?? []) {
      let m = out.get(s.participantId);
      if (!m) {
        m = {};
        out.set(s.participantId, m);
      }
      m[s.categoryKey] = s.value;
    }
    return out;
  }, [scoresFlat]);

  const cats = useMemo(
    () => (categories ?? []).map((c) => ({ key: c.key, label: c.label })),
    [categories],
  );

  const ready = !!evaluation && !!participants && !!categories && !!scoresFlat;

  if (!ready) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Compare" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  const hasEnough = selected && selected.length >= 2;

  if (!hasEnough) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title={evaluation.title} />
        <View style={styles.center}>
          <Text style={styles.muted}>
            {(selected?.length ?? 0) < 2
              ? 'Pick at least two participants to compare.'
              : 'Compare unavailable.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const series: RadarSeries[] = selected.map(({ participant, paletteIndex }) => ({
    id: participant.id,
    scores: scoresByParticipant.get(participant.id) ?? {},
    color: participant.color ?? pickPersonColor(paletteIndex),
  }));

  const chartSize = Math.min(SCREEN_W - spacing.xl * 2, 420);
  const scale = chartSize / LOGICAL;

  const computeOvr = (s: Record<string, number>) => {
    if (cats.length === 0) return 0;
    let sum = 0;
    for (const c of cats) sum += s[c.key] ?? 50;
    return Math.round(sum / cats.length);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title={evaluation.title} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.chartCard,
            { width: chartSize, height: chartSize },
          ]}>
          <Canvas style={{ width: chartSize, height: chartSize }}>
            <Group transform={[{ scale }]}>
              <Rect x={0} y={0} width={LOGICAL} height={LOGICAL}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(LOGICAL, LOGICAL)}
                  colors={[colors.bgElev2, colors.bgElev]}
                />
              </Rect>
              <RadarChart
                center={CENTER}
                radius={RADIUS}
                categories={cats}
                series={series}
              />
            </Group>
          </Canvas>
        </View>

        <View style={styles.legend}>
          {selected.map(({ participant, paletteIndex }) => {
            const pscores = scoresByParticipant.get(participant.id) ?? {};
            const ovr = computeOvr(pscores);
            const grade = gradeFromScore(ovr);
            const color = participant.color ?? pickPersonColor(paletteIndex);
            return (
              <View key={participant.id} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendName} numberOfLines={1}>
                  {participant.name}
                </Text>
                <View style={styles.legendStats}>
                  <Text style={styles.legendOvr}>{ovr}</Text>
                  <Text style={styles.legendGrade}>{grade}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function parseIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  muted: { ...type.body, color: colors.textDim, textAlign: 'center' },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.xl,
  },
  chartCard: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  legend: { width: '100%', gap: spacing.sm },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  legendDot: { width: 16, height: 16, borderRadius: 8 },
  legendName: { ...type.h3, color: colors.text, flex: 1 },
  legendStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  legendOvr: { ...type.metric, color: colors.text, fontSize: 20, lineHeight: 22 },
  legendGrade: { ...type.label, color: colors.accent },
});
