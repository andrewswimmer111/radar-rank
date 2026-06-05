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
import {
  deleteCollection,
  useCollections,
  type CollectionWithCount,
} from '@/db/hooks';
import { useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import { confirmDestructive } from '@/lib/dialog';
import { useStarterPrefs } from '@/lib/starterPrefs';

const isStarter = (id: string) => id.startsWith('builtin-');

const confirmDeleteCollection = (id: string, name: string) =>
  confirmDestructive({
    title: `Delete ${name}?`,
    message:
      'All people will be removed. Existing evaluations keep their participant snapshots.',
    confirmLabel: 'Delete',
    onConfirm: () => deleteCollection(id),
  });

const sortPinnedFirst =
  (pinned: ReadonlySet<string>) =>
  (a: { id: string }, b: { id: string }) =>
    Number(pinned.has(b.id)) - Number(pinned.has(a.id));

export default function CollectionsTab() {
  const { data, loading, error } = useCollections();
  const { hidden, pinned, hiddenTabs, hideTab } = useStarterPrefs();

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
  const yours = all
    .filter((c) => !isStarter(c.id))
    .sort(sortPinnedFirst(pinned));
  const starters = all
    .filter((c) => isStarter(c.id) && !hidden.has(c.id))
    .sort(sortPinnedFirst(pinned));
  const showStarters = !hiddenTabs.has('collections') && starters.length > 0;

  return (
    <TabScreen>
      <TabHeader title="Collections" />
      <TabContent gap={spacing.xxl}>
        <Section title="Yours" caption="Collections you've built.">
          <NewCollectionCta />
          {yours.map((c, i) => (
            <SwipeRow
              key={c.id}
              id={c.id}
              onDelete={() => confirmDeleteCollection(c.id, c.name)}>
              <CollectionRow collection={c} index={i} />
            </SwipeRow>
          ))}
        </Section>

        {showStarters && (
          <Section
            title="Starters"
            caption="A sample crew to get you moving."
            onHide={() => hideTab('collections')}
          >
            {starters.map((c, i) => (
              <SwipeRow key={c.id} id={c.id}>
                <CollectionRow
                  collection={c}
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
  const { pinned } = useStarterPrefs();
  const isPinned = pinned.has(collection.id);
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
