import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/design/tokens';

export type AspectRatio = 'square' | 'story';

type Props = { value: AspectRatio; onChange: (next: AspectRatio) => void };

const OPTIONS: { id: AspectRatio; label: string }[] = [
  { id: 'square', label: 'Square 1:1' },
  { id: 'story', label: 'Story 9:16' },
];

export function AspectToggle({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(o.id);
            }}
            style={[styles.option, active && styles.optionActive]}>
            <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    backgroundColor: colors.bgElev,
    borderRadius: radii.pill,
    gap: 4,
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  optionActive: { backgroundColor: colors.bgElev2 },
  text: { ...type.label, color: colors.textDim },
  textActive: { color: colors.text },
});
