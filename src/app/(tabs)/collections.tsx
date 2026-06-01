import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import {
  TabBareTopBar,
  TabContent,
  TabErrorBox,
  TabHeader,
  TabLoading,
  TabScreen,
} from '@/components/TabScreen';
import { useCollections, type CollectionWithCount } from '@/db/hooks';
import { useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';

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

  const collections = data ?? [];

  if (collections.length === 0) {
    return (
      <TabScreen>
        <TabBareTopBar />
        <EmptyState
          icon="person.3.fill"
          eyebrow="Collections"
          headline="Start with the people."
          body="Reusable pools you can plug into any evaluation. Same group, many rubrics."
          ctaLabel="Create your first collection"
          onCtaPress={() => router.push('/collection/new')}
        />
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <TabHeader
        title="Collections"
        onNewPress={() => router.push('/collection/new')}
      />
      <TabContent>
        {collections.map((c, i) => (
          <CollectionRow key={c.id} collection={c} index={i} />
        ))}
      </TabContent>
    </TabScreen>
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
        style={({ pressed: p }) => [styles.row, p && pressed.default]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={1}>
            {collection.name}
          </Text>
          <Text style={styles.rowMeta}>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  rowName: { ...type.h2, color: t.colors.text },
  rowMeta: { ...type.body, color: t.colors.textDim, marginTop: 2 },
  chevron: { ...type.h2, color: t.colors.textMute, marginLeft: spacing.md },
});
