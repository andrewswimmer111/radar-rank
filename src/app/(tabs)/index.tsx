import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useEvaluations,
  useParticipants,
  useTemplate,
  type Evaluation,
} from '@/db/hooks';
import { colors, radii, spacing, type } from '@/design/tokens';

export default function EvaluationsTab() {
  const insets = useSafeAreaInsets();
  const { data } = useEvaluations();
  const evaluations = data ?? [];
  const empty = evaluations.length === 0;

  if (empty) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.View entering={FadeIn.duration(440)} style={styles.empty}>
          <View style={styles.emptyIcon}>
            {Platform.OS === 'ios' ? (
              <SymbolView
                name="chart.dots.scatter"
                tintColor={colors.textMute}
                size={48}
              />
            ) : (
              <Text style={{ fontSize: 32 }}>📊</Text>
            )}
          </View>
          <Text style={styles.emptyEyebrow}>Evaluations</Text>
          <Text style={styles.emptyHeadline}>Make your first ranking.</Text>
          <Text style={styles.emptyBody}>
            Combine a collection with a template to create a working
            evaluation space.
          </Text>
          <Pressable
            onPress={() => router.push('/evaluation/new')}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>Create your first evaluation</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Evaluations</Text>
        <Pressable
          onPress={() => router.push('/evaluation/new')}
          hitSlop={10}
          style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}>
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}>
        {evaluations.map((e, i) => (
          <EvaluationRow key={e.id} evaluation={e} index={i} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function EvaluationRow({
  evaluation,
  index,
}: {
  evaluation: Evaluation;
  index: number;
}) {
  const { data: template } = useTemplate(evaluation.originTemplateId ?? '');
  const { data: participants } = useParticipants(evaluation.id);

  const emoji = template?.emoji || '✦';
  const accent = template?.accent.start ?? colors.bgElev2;
  const total = participants?.length ?? 0;
  const active = participants?.filter((p) => !p.excluded).length ?? total;
  const subtitle = `${active} ${active === 1 ? 'person' : 'people'} · ${timeAgo(evaluation.updatedAt)}`;

  return (
    <Animated.View entering={FadeInDown.duration(360).delay(60 + index * 30)}>
      <Pressable
        onPress={() => router.push(`/evaluation/${evaluation.id}`)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={[styles.emojiBubble, { backgroundColor: tint(accent) }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
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
}

// Render the template's accent at low opacity behind the emoji so each
// row keeps the visual identity of its rubric without overwhelming.
function tint(hex: string): string {
  // Trust the input is one of our curated #RRGGBB accents.
  if (hex.length !== 7 || !hex.startsWith('#')) return colors.bgElev2;
  return `${hex}33`; // ~20% alpha
}

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return 'just now';
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.bgElev,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyEyebrow: {
    ...type.eyebrow,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  emptyHeadline: { ...type.hero, color: colors.text, textAlign: 'center' },
  emptyBody: {
    ...type.body,
    color: colors.textDim,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  cta: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  ctaText: { ...type.h3, color: colors.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: { ...type.hero, color: colors.text },
  newBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  newBtnText: { ...type.label, color: colors.text },
  list: { paddingHorizontal: spacing.xl, gap: spacing.md },
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
    minHeight: 72,
  },
  emojiBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emoji: { fontSize: 22 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...type.h3, color: colors.text },
  rowSubtitle: { ...type.caption, color: colors.textDim },
  chevron: { ...type.h2, color: colors.textMute },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
