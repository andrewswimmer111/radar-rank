import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import {
  createTemplate,
  createTemplateCategory,
  useTemplate,
  useTemplateCategories,
} from '@/db/hooks';
import { colors, spacing, type } from '@/design/tokens';
import { DEFAULT_ACCENT } from '@/lib/accentPresets';

// Auto-creates a new (optionally cloned) custom template, then redirects
// to its editor. Plan-9 model: every template is a real DB row from the
// moment the user starts editing; "new" is just an async transition.

export default function NewTemplate() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const sourceId = from ?? '';
  const { data: source, loading: sourceLoading } = useTemplate(sourceId);
  const { data: sourceCategories } = useTemplateCategories(sourceId);
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current) return;
    if (from && (sourceLoading || !source || !sourceCategories)) return;
    createdRef.current = true;

    (async () => {
      try {
        const newTmpl = await createTemplate(
          source
            ? {
                name: `${source.name} (copy)`,
                blurb: source.blurb,
                accent: source.accent,
              }
            : {
                name: 'Untitled template',
                blurb: '',
                accent: DEFAULT_ACCENT,
              },
        );
        if (source && sourceCategories) {
          for (let i = 0; i < sourceCategories.length; i++) {
            const cat = sourceCategories[i];
            await createTemplateCategory({
              templateId: newTmpl.id,
              key: cat.key,
              label: cat.label,
              hint: cat.hint,
              position: i,
            });
          }
        }
        router.replace(`/template/${newTmpl.id}/edit`);
      } catch (e) {
        createdRef.current = false;
        console.error('[template/new] failed:', e);
      }
    })();
  }, [from, source, sourceLoading, sourceCategories]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title={from ? 'Duplicating' : 'New template'} />
      <View style={styles.center}>
        <ActivityIndicator color={colors.textDim} />
        <Text style={styles.muted}>
          {from ? 'Copying categories…' : 'Setting up…'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  muted: { ...type.body, color: colors.textDim },
});
