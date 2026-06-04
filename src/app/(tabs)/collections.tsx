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
import { useCollections, type CollectionWithCount } from '@/db/hooks';
import { useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';

const isStarter = (id: string) => id.startsWith('builtin-');

export default function CollectionsTab() {
  const { data, loading, error } = useCollections();

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
  const starters = all.filter((c) => isStarter(c.id));
  const yours = all.filter((c) => !isStarter(c.id));

  return (
    <TabScreen>
      <TabHeader title="Collections" />
      <TabContent gap={spacing.xxl}>
        <Section title="Yours" caption="Collections you've built.">
          <NewCollectionCta />
          {yours.map((c, i) => (
            <CollectionRow key={c.id} collection={c} index={i} />
          ))}
        </Section>

        {starters.length > 0 && (
          <Section
            title="Starters"
            caption="A sample crew to get you moving."
          >
            {starters.map((c, i) => (
              <CollectionRow
                key={c.id}
                collection={c}
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

function NewCollectionCta() {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => router.push('/collection/new')}
      accessibilityRole="button"
      accessibilityLabel="Create a new collection"
      style={({ pressed: p }) => [styles.ctaBlock, p && pressed.default]}>
      <Text style={styles.ctaText}>
        <Text style={styles.ctaAccent}>+ </Text>Create a new collection
      </Text>
    </Pressable>
  );
}

function CollectionRow({
  collection,
  index,
}: {
  collection: CollectionWithCount;
  index: number;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View entering={FadeInDown.duration(360).delay(60 + index * 30)}>
      <Pressable
        onPress={() => router.push(`/collection/${collection.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${collection.name}`}
        style={({ pressed: p }) => [styles.row, p && pressed.default]}>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {collection.name}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {collection.peopleCount}{' '}
            {collection.peopleCount === 1 ? 'person' : 'people'}
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
