import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { HeaderBar } from '@/components/HeaderBar';
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
import { radii, spacing, type } from '@/design/tokens';
import { pickPersonColor } from '@/lib/personColors';

export default function CollectionEditor() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: collection, loading } = useCollection(id);
  const { data: people } = usePeopleForCollection(id);

  // Local draft of the name, synced with DB on collection load and
  // committed back on blur / Done.
  const [nameDraft, setNameDraft] = useState('');
  useEffect(() => {
    if (collection) setNameDraft(collection.name);
  }, [collection?.id, collection?.name]);

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

  const onNameCommit = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(collection.name);
      return;
    }
    if (trimmed === collection.name) return;
    await updateCollection(id, { name: trimmed });
  };

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
    const idx = peopleList.findIndex((p) => p.id === personId);
    if (idx < 0) return;
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= peopleList.length) return;
    const ordered = [...peopleList];
    [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];
    await reorderPeople(
      id,
      ordered.map((p) => p.id),
    );
  };

  const onDeleteCollection = () => {
    Alert.alert(
      'Delete this collection?',
      'All people will be removed. Existing evaluations keep their participant snapshots.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCollection(id);
            if (router.canGoBack()) router.back();
            else router.replace('/collections');
          },
        },
      ],
    );
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
            style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]}>
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
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={onNameCommit}
            onSubmitEditing={onNameCommit}
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

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newPersonName}
              onChangeText={setNewPersonName}
              placeholder="Add a person…"
              placeholderTextColor={colors.textMute}
              returnKeyType="done"
              autoCapitalize="words"
              autoCorrect={false}
              onSubmitEditing={onAddPerson}
              maxLength={40}
            />
            <Pressable
              onPress={onAddPerson}
              disabled={!newPersonName.trim()}
              style={({ pressed }) => [
                styles.addBtn,
                !newPersonName.trim() && styles.addBtnDisabled,
                pressed && newPersonName.trim() && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.addBtnText,
                  !newPersonName.trim() && styles.addBtnTextDisabled,
                ]}>
                Add
              </Text>
            </Pressable>
          </View>
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
  const [draft, setDraft] = useState(person.name);

  useEffect(() => {
    setDraft(person.name);
  }, [person.name]);

  const onSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(person.name);
    } else if (trimmed !== person.name) {
      await updatePerson(person.id, person.collectionId, { name: trimmed });
    }
    setEditing(false);
  };

  const onDelete = () => {
    Alert.alert(`Remove ${person.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deletePerson(person.id, person.collectionId),
      },
    ]);
  };

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
          value={draft}
          onChangeText={setDraft}
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
        <View style={styles.actions}>
          <Pressable
            onPress={() => onReorder('up')}
            disabled={isFirst}
            hitSlop={6}
            style={({ pressed }) => [
              styles.iconBtn,
              isFirst && styles.iconBtnDisabled,
              pressed && !isFirst && styles.pressed,
            ]}>
            <Text
              style={[styles.iconText, isFirst && styles.iconTextDisabled]}>
              ↑
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onReorder('down')}
            disabled={isLast}
            hitSlop={6}
            style={({ pressed }) => [
              styles.iconBtn,
              isLast && styles.iconBtnDisabled,
              pressed && !isLast && styles.pressed,
            ]}>
            <Text
              style={[styles.iconText, isLast && styles.iconTextDisabled]}>
              ↓
            </Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <Text style={[styles.iconText, { color: colors.danger }]}>✕</Text>
          </Pressable>
        </View>
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
  actions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bgElev2,
  },
  iconBtnDisabled: { opacity: 0.35 },
  iconText: { ...type.h3, color: t.colors.text },
  iconTextDisabled: { color: t.colors.textMute },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  addInput: {
    ...type.body,
    flex: 1,
    color: t.colors.text,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  addBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: t.colors.accent,
  },
  addBtnDisabled: { backgroundColor: t.colors.bgElev2 },
  addBtnText: { ...type.h3, color: t.colors.onAccent },
  addBtnTextDisabled: { color: t.colors.textMute },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
