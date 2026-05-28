import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { createCollection } from '@/db/hooks';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { radii, spacing, type } from '@/design/tokens';

export default function NewCollection() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const valid = trimmed.length > 0;

  const onSave = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const c = await createCollection({ name: trimmed });
      router.replace(`/collection/${c.id}`);
    } catch {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="New collection" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Text style={styles.eyebrow}>Collection name</Text>
          <TextInput
            style={styles.input}
            placeholder="College Friends, Roommates, …"
            placeholderTextColor={colors.textMute}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            autoFocus
            autoCapitalize="words"
            maxLength={40}
            onSubmitEditing={onSave}
          />
          <Text style={styles.hint}>You&apos;ll add people on the next screen.</Text>
        </View>
      </KeyboardAvoidingView>
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          onPress={onSave}
          disabled={!valid || busy}
          style={({ pressed }) => [
            styles.cta,
            !valid && styles.ctaDisabled,
            pressed && valid && styles.pressed,
          ]}>
          <Text style={[styles.ctaText, !valid && styles.ctaTextDisabled]}>
            Create
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
  },
  input: {
    ...type.h1,
    color: t.colors.text,
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  hint: { ...type.body, color: t.colors.textDim, marginTop: spacing.xs },
  footer: {
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
  },
  ctaDisabled: { backgroundColor: t.colors.bgElev2 },
  ctaText: { ...type.h2, color: t.colors.onAccent },
  ctaTextDisabled: { color: t.colors.textMute },
  pressed: { transform: [{ scale: 0.98 }] },
});
