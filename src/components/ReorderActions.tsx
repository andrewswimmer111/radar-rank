import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { pressed, spacing, type } from '@/design/tokens';

// ↑ / ↓ / ✕ trailing action cluster used by every reorderable list row
// in the app (people in a collection, categories in a template). The
// row knows its position relative to the list bounds and disables the
// edge arrow accordingly. Delete fires straight through — confirmation
// is the caller's job since the message text varies per resource.

type Props = {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
};

export function ReorderActions({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.actions}>
      <ArrowButton
        glyph="↑"
        disabled={isFirst}
        onPress={onMoveUp}
        styles={styles}
      />
      <ArrowButton
        glyph="↓"
        disabled={isLast}
        onPress={onMoveDown}
        styles={styles}
      />
      <Pressable
        onPress={onDelete}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Remove"
        style={({ pressed: p }) => [styles.iconBtn, p && pressed.default]}>
        <Text style={[styles.iconText, { color: colors.danger }]}>✕</Text>
      </Pressable>
    </View>
  );
}

function ArrowButton({
  glyph,
  disabled,
  onPress,
  styles,
}: {
  glyph: '↑' | '↓';
  disabled: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={glyph === '↑' ? 'Move up' : 'Move down'}
      style={({ pressed: p }) => [
        styles.iconBtn,
        disabled && styles.iconBtnDisabled,
        p && !disabled && pressed.default,
      ]}>
      <Text style={[styles.iconText, disabled && styles.iconTextDisabled]}>
        {glyph}
      </Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
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
  });
