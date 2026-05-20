import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import {
  useTemplate,
  useTemplateCategories,
  type TemplateCategory,
} from '@/db/hooks';
import { colors, radii, spacing, type } from '@/design/tokens';

export default function TemplateView() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: template, loading } = useTemplate(id);
  const { data: categories } = useTemplateCategories(id);

  if (loading && !template) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Template" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textDim} />
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeaderBar title="Template" />
        <View style={styles.center}>
          <Text style={styles.muted}>Template not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cats = categories ?? [];
  const isBuiltin = template.isBuiltin;

  const onPrimary = () => {
    if (isBuiltin) {
      router.push(`/template/new?from=${template.id}`);
    } else {
      router.push(`/template/${template.id}/edit`);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="Template" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[template.accent.start, template.accent.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.heroEmojiBubble}>
            <Text style={styles.heroEmoji}>{template.emoji || '✦'}</Text>
          </View>
          <Text style={styles.heroEyebrow}>
            {isBuiltin ? 'Starter template' : 'Custom template'}
          </Text>
          <Text style={styles.heroName}>{template.name}</Text>
          {template.blurb.length > 0 && (
            <Text style={styles.heroBlurb}>{template.blurb}</Text>
          )}
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <Text style={styles.sectionCaption}>
              {cats.length} {cats.length === 1 ? 'dimension' : 'dimensions'}
            </Text>
          </View>
          <View style={styles.catList}>
            {cats.map((c, i) => (
              <CategoryRow key={c.id} category={c} index={i} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}>
        <Pressable
          onPress={onPrimary}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <Text style={styles.ctaText}>
            {isBuiltin ? 'Duplicate to customize' : 'Edit template'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CategoryRow({
  category,
  index,
}: {
  category: TemplateCategory;
  index: number;
}) {
  return (
    <View style={styles.catRow}>
      <Text style={styles.catNum}>{String(index + 1).padStart(2, '0')}</Text>
      <Text style={styles.catLabel} numberOfLines={1}>
        {category.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: colors.textDim },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  hero: {
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  heroEmojiBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.30)',
    marginBottom: spacing.sm,
  },
  heroEmoji: { fontSize: 36 },
  heroEyebrow: {
    ...type.eyebrow,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
  },
  heroName: { ...type.hero, color: '#fff', textAlign: 'center' },
  heroBlurb: {
    ...type.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 320,
  },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    ...type.eyebrow,
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  sectionCaption: { ...type.caption, color: colors.textMute },
  catList: { gap: spacing.sm },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  catNum: { ...type.eyebrow, color: colors.textMute, width: 24 },
  catLabel: { ...type.h3, color: colors.text, flex: 1 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cta: {
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  ctaText: { ...type.h2, color: colors.bg },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
