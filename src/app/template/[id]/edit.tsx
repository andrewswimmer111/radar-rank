import { LinearGradient } from 'expo-linear-gradient';
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
  createTemplateCategory,
  deleteTemplate,
  deleteTemplateCategory,
  reorderTemplateCategories,
  updateTemplate,
  updateTemplateCategory,
  useTemplate,
  useTemplateCategories,
  type TemplateAccent,
  type TemplateCategory,
} from '@/db/hooks';
import { genId } from '@/db/util';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { radii, spacing, type } from '@/design/tokens';
import { ACCENT_PRESETS, accentEquals } from '@/lib/accentPresets';

export default function TemplateEditor() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: template, loading } = useTemplate(id);
  const { data: categories } = useTemplateCategories(id);

  const [nameDraft, setNameDraft] = useState('');
  const [blurbDraft, setBlurbDraft] = useState('');
  useEffect(() => {
    if (template) {
      setNameDraft(template.name);
      setBlurbDraft(template.blurb);
    }
  }, [template?.id, template?.name, template?.blurb]);

  const [newCategoryLabel, setNewCategoryLabel] = useState('');

  if (loading && !template) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Edit template" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Edit template" />
        <View style={styles.center}>
          <Text style={styles.muted}>Template not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Defense in depth — the gallery routes built-ins to the read-only
  // view, but the CRUD layer also rejects mutations on built-ins.
  if (template.isBuiltin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Built-in template" />
        <View style={styles.center}>
          <Text style={styles.muted}>Built-in templates can&apos;t be edited.</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const cats = categories ?? [];

  const onNameCommit = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(template.name);
      return;
    }
    if (trimmed === template.name) return;
    await updateTemplate(id, { name: trimmed });
  };

  const onBlurbCommit = async () => {
    if (blurbDraft === template.blurb) return;
    await updateTemplate(id, { blurb: blurbDraft });
  };

  const onAccentPick = async (accent: TemplateAccent) => {
    if (accentEquals(accent, template.accent)) return;
    await updateTemplate(id, { accent });
  };

  const onAddCategory = async () => {
    const trimmed = newCategoryLabel.trim();
    if (!trimmed) return;
    const newId = genId();
    await createTemplateCategory({
      id: newId,
      templateId: id,
      key: newId, // id-as-key for custom categories; user-invisible
      label: trimmed,
      position: cats.length,
    });
    setNewCategoryLabel('');
  };

  const onReorderCategory = async (
    categoryId: string,
    direction: 'up' | 'down',
  ) => {
    const idx = cats.findIndex((c) => c.id === categoryId);
    if (idx < 0) return;
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= cats.length) return;
    const ordered = [...cats];
    [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];
    await reorderTemplateCategories(
      id,
      ordered.map((c) => c.id),
    );
  };

  const onDeleteTemplate = () => {
    Alert.alert(
      'Delete this template?',
      'Existing evaluations created from it keep their snapshotted categories.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(id);
            if (router.canGoBack()) router.back();
            else router.replace('/templates');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar
        title="Edit template"
        right={
          <Pressable
            onPress={onDeleteTemplate}
            hitSlop={10}
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
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Preview
            name={nameDraft || 'Untitled'}
            accent={template.accent}
          />

          <Text style={styles.eyebrow}>Name</Text>
          <TextInput
            style={styles.input}
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={onNameCommit}
            onSubmitEditing={onNameCommit}
            returnKeyType="done"
            maxLength={40}
            autoCorrect={false}
          />

          <Text style={styles.eyebrow}>Blurb</Text>
          <TextInput
            style={[styles.input, styles.blurbInput]}
            value={blurbDraft}
            onChangeText={setBlurbDraft}
            onBlur={onBlurbCommit}
            placeholder="One-line description"
            placeholderTextColor={colors.textMute}
            multiline
            maxLength={140}
          />

          <Text style={styles.eyebrow}>Accent</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatchRow}>
            {ACCENT_PRESETS.map((preset, i) => {
              const active = accentEquals(preset, template.accent);
              return (
                <Pressable
                  key={i}
                  onPress={() => onAccentPick(preset)}
                  style={({ pressed }) => [
                    styles.swatchOuter,
                    active && styles.swatchOuterActive,
                    pressed && styles.pressed,
                  ]}>
                  <LinearGradient
                    colors={[preset.start, preset.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.swatchInner}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.catsHeader}>
            <Text style={styles.eyebrow}>Categories</Text>
            <Text style={styles.catsCount}>
              {cats.length} {cats.length === 1 ? 'dimension' : 'dimensions'}
            </Text>
          </View>

          <View style={styles.catList}>
            {cats.map((c, i) => (
              <CategoryRow
                key={c.id}
                category={c}
                index={i}
                isFirst={i === 0}
                isLast={i === cats.length - 1}
                onReorder={(dir) => onReorderCategory(c.id, dir)}
              />
            ))}
            {cats.length === 0 && (
              <View style={styles.catsEmpty}>
                <Text style={styles.catsEmptyText}>
                  Add a category below to start the rubric.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newCategoryLabel}
              onChangeText={setNewCategoryLabel}
              placeholder="Add a category…"
              placeholderTextColor={colors.textMute}
              returnKeyType="done"
              autoCapitalize="sentences"
              onSubmitEditing={onAddCategory}
              maxLength={40}
            />
            <Pressable
              onPress={onAddCategory}
              disabled={!newCategoryLabel.trim()}
              style={({ pressed }) => [
                styles.addBtn,
                !newCategoryLabel.trim() && styles.addBtnDisabled,
                pressed && newCategoryLabel.trim() && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.addBtnText,
                  !newCategoryLabel.trim() && styles.addBtnTextDisabled,
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

function Preview({
  name,
  accent,
}: {
  name: string;
  accent: TemplateAccent;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <LinearGradient
      colors={[accent.start, accent.end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.preview}>
      <Text style={styles.previewName} numberOfLines={1}>
        {name}
      </Text>
    </LinearGradient>
  );
}

function CategoryRow({
  category,
  index,
  isFirst,
  isLast,
  onReorder,
}: {
  category: TemplateCategory;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onReorder: (direction: 'up' | 'down') => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.label);

  useEffect(() => {
    setDraft(category.label);
  }, [category.label]);

  const onSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(category.label);
    } else if (trimmed !== category.label) {
      await updateTemplateCategory(category.id, category.templateId, {
        label: trimmed,
      });
    }
    setEditing(false);
  };

  const onDelete = () => {
    Alert.alert(`Remove "${category.label}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          deleteTemplateCategory(category.id, category.templateId),
      },
    ]);
  };

  return (
    <View style={styles.catRow}>
      <Text style={styles.catNum}>{String(index + 1).padStart(2, '0')}</Text>
      {editing ? (
        <TextInput
          style={styles.catInput}
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
          style={styles.catLabelWrap}
          onPress={() => setEditing(true)}>
          <Text style={styles.catLabel} numberOfLines={1}>
            {category.label}
          </Text>
        </Pressable>
      )}
      {!editing && (
        <View style={styles.catActions}>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  muted: { ...type.body, color: t.colors.textDim },
  backBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: t.colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  backBtnText: { ...type.label, color: t.colors.text },
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
  preview: {
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  previewName: { ...type.h1, color: '#fff', textAlign: 'center' },
  eyebrow: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  input: {
    ...type.h3,
    color: t.colors.text,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    marginTop: spacing.xs,
  },
  blurbInput: { minHeight: 64, textAlignVertical: 'top' },
  swatchRow: { paddingVertical: spacing.sm, gap: spacing.sm },
  swatchOuter: {
    padding: 3,
    borderRadius: radii.lg + 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOuterActive: { borderColor: t.colors.accent },
  swatchInner: {
    width: 56,
    height: 40,
    borderRadius: radii.lg - 4,
  },
  catsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.lg,
  },
  catsCount: { ...type.caption, color: t.colors.textMute },
  catList: { marginTop: spacing.sm, gap: spacing.sm },
  catsEmpty: {
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  catsEmptyText: {
    ...type.body,
    color: t.colors.textDim,
    textAlign: 'center',
  },
  catRow: {
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
  catNum: { ...type.eyebrow, color: t.colors.textMute, width: 24 },
  catLabelWrap: { flex: 1 },
  catLabel: { ...type.h3, color: t.colors.text },
  catInput: {
    ...type.h3,
    color: t.colors.text,
    flex: 1,
    paddingVertical: 0,
  },
  catActions: { flexDirection: 'row', gap: spacing.xs },
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
