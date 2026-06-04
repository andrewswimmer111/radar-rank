import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SwipeRow } from '@/components/SwipeRow';
import {
  Section,
  TabContent,
  TabErrorBox,
  TabHeader,
  TabLoading,
  TabScreen,
} from '@/components/TabScreen';
import { deleteTemplate, useTemplates, type Template } from '@/db/hooks';
import { useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import { confirmDestructive } from '@/lib/dialog';
import { useStarterPrefs } from '@/lib/starterPrefs';

const confirmDeleteTemplate = (id: string, name: string) =>
  confirmDestructive({
    title: `Delete ${name}?`,
    message:
      'Existing evaluations created from it keep their snapshotted categories.',
    confirmLabel: 'Delete',
    onConfirm: () => deleteTemplate(id),
  });

const sortPinnedFirst =
  (pinned: ReadonlySet<string>) =>
  (a: { id: string }, b: { id: string }) =>
    Number(pinned.has(b.id)) - Number(pinned.has(a.id));

export default function TemplatesTab() {
  const { data, loading, error } = useTemplates();
  const { hidden, pinned, hiddenTabs, hide, hideTab } = useStarterPrefs();

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
  const customs = all
    .filter((t) => !t.isBuiltin)
    .sort(sortPinnedFirst(pinned));
  const builtins = all
    .filter((t) => t.isBuiltin && !hidden.has(t.id))
    .sort(sortPinnedFirst(pinned));
  const showStarters = !hiddenTabs.has('templates') && builtins.length > 0;

  return (
    <TabScreen>
      <TabHeader title="Templates" />
      <TabContent gap={spacing.xxl}>
        <Section title="Yours" caption="Templates you've duplicated or built.">
          <NewTemplateCta />
          {customs.map((t, i) => (
            <SwipeRow
              key={t.id}
              id={t.id}
              onDelete={() => confirmDeleteTemplate(t.id, t.name)}>
              <TemplateCard template={t} index={i} />
            </SwipeRow>
          ))}
        </Section>

        {showStarters && (
          <Section
            title="Starters"
            caption="Curated rubrics to start from."
            onHide={() => hideTab('templates')}>
            {builtins.map((t, i) => (
              <SwipeRow
                key={t.id}
                id={t.id}
                onDelete={() => hide(t.id)}>
                <TemplateCard
                  template={t}
                  index={customs.length + i}
                />
              </SwipeRow>
            ))}
          </Section>
        )}
      </TabContent>
    </TabScreen>
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
  const { pinned } = useStarterPrefs();
  const isPinned = pinned.has(template.id);
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
        {isPinned && <View style={styles.pinDot} />}
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

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
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    overflow: 'hidden',
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
