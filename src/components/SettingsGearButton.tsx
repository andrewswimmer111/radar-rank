import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { radii } from '@/design/tokens';

export function SettingsGearButton() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      {Platform.OS === 'ios' ? (
        <SymbolView name="gearshape.fill" tintColor={colors.text} size={20} />
      ) : (
        <Text style={styles.glyph}>⚙</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bgElev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  glyph: { color: t.colors.text, fontSize: 18 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.96 }] },
});
