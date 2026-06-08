import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemRow } from '@/components/AddItemRow';
import { HeaderBar } from '@/components/HeaderBar';
import { ReorderActions } from '@/components/ReorderActions';
import {
  createPerson,
  deleteCollection,
  deletePerson,
  reorderPeople,
  updateCollection,
  updatePerson,
  useCollection,
  usePeopleForCollection,
  type Person,
} from '@/db/hooks';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import { confirmDestructive } from '@/lib/dialog';
import { pickPersonColor } from '@/lib/personColors';
import { swapAdjacent } from '@/lib/reorder';
import { useDraftField } from '@/lib/useDraftField';

export default function CollectionEditor() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: collection, loading } = useCollection(id);
  const { data: people } = usePeopleForCollection(id);

  const name = useDraftField(
    collection?.name,
    (next) => updateCollection(id, { name: next }),
    { commitOnUnmount: true },
  );

  const [newPersonName, setNewPersonName] = useState('');

  if (loading && !collection) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Collection" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  if (!collection) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Collection" />
        <View style={styles.center}>
          <Text style={styles.missing}>Collection not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const peopleList = people ?? [];

  const onAddPerson = async () => {
    const trimmed = newPersonName.trim();
    if (!trimmed) return;
    await createPerson({
      collectionId: id,
      name: trimmed,
      color: pickPersonColor(peopleList.length),
    });
    setNewPersonName('');
  };

  const onReorder = async (personId: string, direction: 'up' | 'down') => {
    const next = swapAdjacent(peopleList, personId, direction);
    if (!next) return;
    await reorderPeople(id, next);
  };

  const onDeleteCollection = () => {
    confirmDestructive({
      title: 'Delete this collection?',
      message:
        'All people will be removed. Existing evaluations keep their participant snapshots.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteCollection(id);
        if (router.canGoBack()) router.back();
        else router.replace('/collections');
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar
        title={collection.name}
        right={
          <Pressable
            onPress={onDeleteCollection}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Delete collection"
            style={({ pressed: p }) => [styles.menuBtn, p && pressed.default]}>
            <Text style={styles.menuBtnText}>⋯</Text>
          </Pressable>
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>Name</Text>
          <TextInput
            style={styles.nameInput}
            value={name.value}
            onChangeText={name.setValue}
            onBlur={name.commit}
            onSubmitEditing={name.commit}
            returnKeyType="done"
            maxLength={40}
            autoCorrect={false}
          />

          <View style={styles.peopleHeader}>
            <Text style={styles.eyebrow}>People</Text>
            <Text style={styles.peopleCount}>
              {peopleList.length}{' '}
              {peopleList.length === 1 ? 'person' : 'people'}
            </Text>
          </View>

          <View style={styles.peopleList}>
            {peopleList.map((p, i) => (
              <PersonRow
                key={p.id}
                person={p}
                isFirst={i === 0}
                isLast={i === peopleList.length - 1}
                onReorder={(dir) => onReorder(p.id, dir)}
              />
            ))}
          </View>

          <AddItemRow
            value={newPersonName}
            onChangeText={setNewPersonName}
            onAdd={onAddPerson}
            placeholder="Add a person…"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PersonRow({
  person,
  isFirst,
  isLast,
  onReorder,
}: {
  person: Person;
  isFirst: boolean;
  isLast: boolean;
  onReorder: (direction: 'up' | 'down') => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [editing, setEditing] = useState(false);
  const name = useDraftField(person.name, (next) =>
    updatePerson(person.id, person.collectionId, { name: next }),
  );

  const onSave = async () => {
    await name.commit();
    setEditing(false);
  };

  const onDelete = () =>
    confirmDestructive({
      title: `Remove ${person.name}?`,
      confirmLabel: 'Remove',
      onConfirm: () => deletePerson(person.id, person.collectionId),
    });

  return (
    <View style={styles.personRow}>
      <View
        style={[
          styles.colorChip,
          { backgroundColor: person.color ?? colors.bgElev2 },
        ]}>
        <Text style={styles.colorChipText}>
          {person.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      {editing ? (
        <TextInput
          style={styles.personInput}
          value={name.value}
          onChangeText={name.setValue}
          autoFocus
          onSubmitEditing={onSave}
          onBlur={onSave}
          returnKeyType="done"
          maxLength={40}
        />
      ) : (
        <Pressable
          style={styles.personNameWrap}
          onPress={() => setEditing(true)}>
          <Text style={styles.personName} numberOfLines={1}>
            {person.name}
          </Text>
        </Pressable>
      )}
      {!editing && (
        <ReorderActions
          isFirst={isFirst}
          isLast={isLast}
          onMoveUp={() => onReorder('up')}
          onMoveDown={() => onReorder('down')}
          onDelete={onDelete}
        />
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { ...type.body, color: t.colors.textDim },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bgElev,
  },
  menuBtnText: { ...type.h2, color: t.colors.text, lineHeight: 22 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  eyebrow: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
  },
  nameInput: {
    ...type.h1,
    color: t.colors.text,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  peopleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  peopleCount: { ...type.caption, color: t.colors.textMute },
  peopleList: { marginTop: spacing.sm, gap: spacing.sm },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    minHeight: 56,
    gap: spacing.md,
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipText: { ...type.h3, color: '#fff' },
  personNameWrap: { flex: 1 },
  personName: { ...type.h3, color: t.colors.text },
  personInput: {
    ...type.h3,
    color: t.colors.text,
    flex: 1,
    paddingVertical: 0,
  },
});
