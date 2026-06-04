import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  TabContent,
  TabErrorBox,
  TabHeader,
  TabLoading,
  TabScreen,
} from '@/components/TabScreen';
import { useTemplates, type Template } from '@/db/hooks';
import { useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';

export default function TemplatesTab() {
  const { data, loading, error } = useTemplates();

  if (loading && !data) {
    return (
      <TabScreen>
        <TabLoading />
      </TabScreen>
    );
  }

  if (error) {
    return (
      <TabScreen>
        <TabErrorBox message={error.message} />
      </TabScreen>
    );
  }

  const all = data ?? [];
  const builtins = all.filter((t) => t.isBuiltin);
  const customs = all.filter((t) => !t.isBuiltin);

  return (
    <TabScreen>
      <TabHeader title="Templates" />
      <TabContent gap={spacing.xxl}>
        <Section title="Yours" caption="Templates you've duplicated or built.">
          <NewTemplateCta />
          {customs.map((t, i) => (
            <TemplateCard key={t.id} template={t} index={i} />
          ))}
        </Section>

        <Section title="Starters" caption="Curated rubrics to start from.">
          {builtins.map((t, i) => (
            <TemplateCard
              key={t.id}
              template={t}
              index={customs.length + i}
            />
          ))}
        </Section>
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

function NewTemplateCta() {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => router.push('/template/new')}
      accessibilityRole="button"
      accessibilityLabel="Build a new template from scratch"
      style={({ pressed: p }) => [styles.ctaBlock, p && pressed.default]}>
      <Text style={styles.ctaText}>
        <Text style={styles.ctaAccent}>+ </Text>Build a new template from scratch
      </Text>
    </Pressable>
  );
}

function TemplateCard({ template, index }: { template: Template; index: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View entering={FadeInDown.duration(360).delay(60 + index * 40)}>
      <Pressable
        onPress={() => router.push(`/template/${template.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${template.name}`}
        style={({ pressed: p }) => [styles.row, p && pressed.default]}>
        <LinearGradient
          colors={[template.accent.start, template.accent.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.swatch}
        />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {template.name}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {template.blurb}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

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
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    overflow: 'hidden',
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
