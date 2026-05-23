import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTemplates, type Template } from '@/db/hooks';
import { colors, radii, spacing, type } from '@/design/tokens';

export default function TemplatesTab() {
  const insets = useSafeAreaInsets();
  const { data, loading, error } = useTemplates();

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Couldn&apos;t load templates.</Text>
          <Text style={styles.errorSub}>{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const all = data ?? [];
  const builtins = all.filter((t) => t.isBuiltin);
  const customs = all.filter((t) => !t.isBuiltin);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Templates</Text>
        <Pressable
          onPress={() => router.push('/template/new')}
          hitSlop={10}
          style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}>
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <Section title="Starters" caption="Curated rubrics to start from.">
          {builtins.map((t, i) => (
            <TemplateCard key={t.id} template={t} index={i} />
          ))}
        </Section>

        <Section title="Yours" caption="Templates you've duplicated or built.">
          {customs.length === 0 ? (
            <View style={styles.emptyYours}>
              <Text style={styles.emptyYoursText}>
                Duplicate a starter or tap{' '}
                <Text style={styles.emptyYoursAccent}>+ New</Text> to build one
                from scratch.
              </Text>
            </View>
          ) : (
            customs.map((t, i) => (
              <TemplateCard key={t.id} template={t} index={builtins.length + i} />
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
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

function TemplateCard({ template, index }: { template: Template; index: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(360).delay(60 + index * 40)}>
      <Pressable
        onPress={() => router.push(`/template/${template.id}`)}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <LinearGradient
          colors={[template.accent.start, template.accent.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>
              {template.name}
            </Text>
            <Text style={styles.cardBlurb} numberOfLines={2}>
              {template.blurb}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorText: { ...type.h3, color: colors.text },
  errorSub: { ...type.body, color: colors.textDim, textAlign: 'center' },
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
  scroll: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
  section: { gap: spacing.md },
  sectionHeader: { gap: 4 },
  sectionTitle: {
    ...type.eyebrow,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  sectionCaption: { ...type.caption, color: colors.textMute },
  sectionBody: { gap: spacing.md },
  card: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 96,
    overflow: 'hidden',
  },
  cardBody: { flex: 1, gap: 2 },
  cardName: { ...type.h2, color: '#fff' },
  cardBlurb: { ...type.body, color: 'rgba(255,255,255,0.86)' },
  emptyYours: {
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyYoursText: {
    ...type.body,
    color: colors.textDim,
    textAlign: 'center',
  },
  emptyYoursAccent: { color: colors.accent },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
