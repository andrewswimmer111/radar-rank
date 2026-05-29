import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsGearButton } from '@/components/SettingsGearButton';
import { useCollections, type CollectionWithCount } from '@/db/hooks';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { radii, spacing, type } from '@/design/tokens';

export default function CollectionsTab() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data, loading, error } = useCollections();

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
          <Text style={styles.errorText}>Couldn&apos;t load collections.</Text>
          <Text style={styles.errorSub}>{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const collections = data ?? [];
  const empty = collections.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {empty ? (
        <>
          <View style={styles.topBar}>
            <SettingsGearButton />
          </View>
          <EmptyState />
        </>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Collections</Text>
            <View style={styles.headerActions}>
              <SettingsGearButton />
              <NewButton />
            </View>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.list,
              { paddingBottom: insets.bottom + spacing.xxxl },
            ]}
            showsVerticalScrollIndicator={false}>
            {collections.map((c, i) => (
              <CollectionRow key={c.id} collection={c} index={i} />
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function NewButton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => router.push('/collection/new')}
      hitSlop={10}
      style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}>
      <Text style={styles.newBtnText}>+ New</Text>
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
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
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

function EmptyState() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View entering={FadeIn.duration(440)} style={styles.empty}>
      {Platform.OS === 'ios' && (
        <View style={styles.emptyIcon}>
          <SymbolView name="person.3.fill" tintColor={colors.textMute} size={48} />
        </View>
      )}
      <Text style={styles.emptyEyebrow}>Collections</Text>
      <Text style={styles.emptyHeadline}>Start with the people.</Text>
      <Text style={styles.emptyBody}>
        Reusable pools you can plug into any evaluation. Same group, many rubrics.
      </Text>
      <Pressable
        onPress={() => router.push('/collection/new')}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <Text style={styles.ctaText}>Create your first collection</Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorText: { ...type.h3, color: t.colors.text },
  errorSub: { ...type.body, color: t.colors.textDim, textAlign: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: { ...type.hero, color: t.colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  newBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: t.colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  newBtnText: { ...type.label, color: t.colors.text },
  list: { paddingHorizontal: spacing.xl, gap: spacing.md },
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
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
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
    backgroundColor: t.colors.bgElev,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  emptyEyebrow: {
    ...type.eyebrow,
    color: t.colors.accent,
    textTransform: 'uppercase',
  },
  emptyHeadline: { ...type.hero, color: t.colors.text, textAlign: 'center' },
  emptyBody: {
    ...type.body,
    color: t.colors.textDim,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  cta: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: t.colors.accent,
  },
  ctaText: { ...type.h3, color: t.colors.onAccent },
});
