import { StyleSheet, TextInput, Pressable, Text, View } from 'react-native';

import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';

// Text input + "Add" button at the bottom of CRUD list editors. Same
// disabled-on-empty rule everywhere — the parent owns the input value
// and the submit callback; this component only renders the affordance.

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  onAdd: () => void;
  placeholder: string;
  autoCapitalize?: 'sentences' | 'words' | 'none';
  autoCorrect?: boolean;
  maxLength?: number;
};

export function AddItemRow({
  value,
  onChangeText,
  onAdd,
  placeholder,
  autoCapitalize = 'words',
  autoCorrect = false,
  maxLength = 40,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0;

  return (
    <View style={styles.addRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMute}
        returnKeyType="done"
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onSubmitEditing={onAdd}
        maxLength={maxLength}
      />
      <Pressable
        onPress={onAdd}
        disabled={!canSubmit}
        style={({ pressed: p }) => [
          styles.btn,
          !canSubmit && styles.btnDisabled,
          p && canSubmit && pressed.default,
        ]}>
        <Text style={[styles.btnText, !canSubmit && styles.btnTextDisabled]}>
          Add
        </Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    input: {
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
    btn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: t.colors.accent,
    },
    btnDisabled: { backgroundColor: t.colors.bgElev2 },
    btnText: { ...type.h3, color: t.colors.onAccent },
    btnTextDisabled: { color: t.colors.textMute },
  });
