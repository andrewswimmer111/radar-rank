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
import { colors, radii, spacing, type } from '@/design/tokens';

export default function NewCollection() {
  const insets = useSafeAreaInsets();
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  input: {
    ...type.h1,
    color: colors.text,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  hint: { ...type.body, color: colors.textDim, marginTop: spacing.xs },
  footer: {
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
  ctaDisabled: { backgroundColor: colors.bgElev2 },
  ctaText: { ...type.h2, color: colors.bg },
  ctaTextDisabled: { color: colors.textMute },
  pressed: { transform: [{ scale: 0.98 }] },
});
