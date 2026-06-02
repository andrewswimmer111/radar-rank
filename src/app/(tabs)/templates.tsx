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
        style={({ pressed: p }) => [p && pressed.default]}>
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
