import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { HeaderBar } from '@/components/HeaderBar';
import * as peopleDb from '@/db/people';
import * as templateCategoriesDb from '@/db/templateCategories';
import {
  snapshotEvaluation,
  useCollections,
  useEvaluations,
  useTemplates,
  type CollectionWithCount,
  type Template,
} from '@/db/hooks';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';

export default function NewEvaluation() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data: collections, loading: collectionsLoading } = useCollections();
  const { data: templates, loading: templatesLoading } = useTemplates();
  const { data: existingEvaluations } = useEvaluations();

  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleEdited, setTitleEdited] = useState(false);
  const [busy, setBusy] = useState(false);

  // Auto-suggest title from the chosen pair, unless the user has typed
  // their own. Suffix " (2)", " (3)", ... when the base collides with an
  // existing evaluation title so the user can see the final name up front.
  useEffect(() => {
    if (titleEdited) return;
    if (!collections || !templates) return;
    const c = collections.find((x) => x.id === collectionId);
    const t = templates.find((x) => x.id === templateId);
    if (c && t) {
      const base = `${c.name} × ${t.name}`;
      const existing = (existingEvaluations ?? []).map((e) => e.title);
      setTitle(suffixToUnique(base, existing));
    } else {
      setTitle('');
    }
  }, [
    collectionId,
    templateId,
    collections,
    templates,
    existingEvaluations,
    titleEdited,
  ]);

  if (collectionsLoading || templatesLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="New evaluation" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  const colls = collections ?? [];
  const tmpls = templates ?? [];

  if (colls.length === 0 || tmpls.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="New evaluation" />
        <View style={styles.missingBox}>
          <Text style={styles.missingTitle}>
            {colls.length === 0
              ? 'Create a collection first'
              : 'Pick a template first'}
          </Text>
          <Text style={styles.missingBody}>
            {colls.length === 0
              ? 'An evaluation snapshots a collection of people. Add one to start.'
              : 'You need at least one template to define the rubric.'}
          </Text>
          <Pressable
            onPress={() =>
              router.replace(colls.length === 0 ? '/collections' : '/templates')
            }
            style={({ pressed: p }) => [styles.missingCta, p && pressed.default]}>
            <Text style={styles.missingCtaText}>
              Go to {colls.length === 0 ? 'Collections' : 'Templates'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const valid =
    !!collectionId && !!templateId && title.trim().length > 0 && !busy;

  const onCreate = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const [people, cats] = await Promise.all([
        peopleDb.listPeopleForCollection(collectionId!),
        templateCategoriesDb.listTemplateCategories(templateId!),
      ]);
      if (cats.length === 0) {
        setBusy(false);
        return;
      }
      // Belt-and-suspenders against duplicate titles: re-check at create
      // time, since the user may have typed a custom name that collides,
      // or another evaluation may have appeared since the title was set.
      const existing = (existingEvaluations ?? []).map((e) => e.title);
      const finalTitle = suffixToUnique(title.trim(), existing);
      const newId = await snapshotEvaluation({
        title: finalTitle,
        collectionId: collectionId!,
        people,
        templateId: templateId!,
        categories: cats,
      });
      router.replace(`/evaluation/${newId}`);
    } catch (e) {
      console.error('[evaluation/new] failed:', e);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="New evaluation" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Section title="Who">
            {colls.map((c) => (
              <CollectionPickRow
                key={c.id}
                collection={c}
                selected={collectionId === c.id}
                onPress={() => setCollectionId(c.id)}
              />
            ))}
          </Section>

          <Section title="What">
            {tmpls.map((t) => (
              <TemplatePickRow
                key={t.id}
                template={t}
                selected={templateId === t.id}
                onPress={() => setTemplateId(t.id)}
              />
            ))}
          </Section>

          <Section title="Title">
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setTitleEdited(true);
              }}
              placeholder="Saturday rankings"
              placeholderTextColor={colors.textMute}
              returnKeyType="done"
              maxLength={60}
            />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          onPress={onCreate}
          disabled={!valid}
          style={({ pressed: p }) => [
            styles.cta,
            !valid && styles.ctaDisabled,
            p && valid && pressed.default,
          ]}>
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={[styles.ctaText, !valid && styles.ctaTextDisabled]}>
              Create evaluation
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function CollectionPickRow({
  collection,
  selected,
  onPress,
}: {
  collection: CollectionWithCount;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [
        styles.pickRow,
        selected && styles.pickRowSelected,
        p && pressed.default,
      ]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.pickName}>{collection.name}</Text>
        <Text style={styles.pickMeta}>
          {collection.peopleCount}{' '}
          {collection.peopleCount === 1 ? 'person' : 'people'}
        </Text>
      </View>
      <Radio selected={selected} />
    </Pressable>
  );
}

function TemplatePickRow({
  template,
  selected,
  onPress,
}: {
  template: Template;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [
        styles.pickRow,
        selected && styles.pickRowSelected,
        p && pressed.default,
      ]}>
      <LinearGradient
        colors={[template.accent.start, template.accent.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tmplAccent}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.pickName} numberOfLines={1}>
          {template.name}
        </Text>
        <Text style={styles.pickMeta} numberOfLines={1}>
          {template.blurb}
        </Text>
      </View>
      <Radio selected={selected} />
    </Pressable>
  );
}

function Radio({ selected }: { selected: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  );
}

function suffixToUnique(base: string, existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`;
    if (!taken.has(candidate)) return candidate;
  }
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  missingTitle: { ...type.h1, color: t.colors.text, textAlign: 'center' },
  missingBody: {
    ...type.body,
    color: t.colors.textDim,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  missingCta: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: t.colors.accent,
  },
  missingCtaText: { ...type.h3, color: t.colors.onAccent },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    ...type.eyebrow,
    color: t.colors.accent,
    textTransform: 'uppercase',
  },
  sectionBody: { gap: spacing.sm },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  pickRowSelected: { borderColor: t.colors.accent, borderWidth: 1 },
  pickName: { ...type.h3, color: t.colors.text },
  pickMeta: { ...type.caption, color: t.colors.textDim, marginTop: 2 },
  tmplAccent: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: t.colors.accent },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: t.colors.accent,
  },
  titleInput: {
    ...type.h2,
    color: t.colors.text,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: t.colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
  },
  cta: {
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    backgroundColor: t.colors.accent,
    minHeight: 56,
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: t.colors.bgElev2 },
  ctaText: { ...type.h2, color: t.colors.onAccent },
  ctaTextDisabled: { color: t.colors.textMute },
});
