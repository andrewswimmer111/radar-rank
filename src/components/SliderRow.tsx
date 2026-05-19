import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/design/tokens';

type Props = {
  label: string;
  value: number;
  accent: string;
  onChange: (next: number) => void;
};

export function SliderRow({ label, value, accent, onChange }: Props) {
  const handleComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.pill, { borderColor: accent }]}>
          <Text style={[styles.pillText, { color: accent }]}>{Math.round(value)}</Text>
        </View>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={value}
        onValueChange={onChange}
        onSlidingComplete={handleComplete}
        minimumTrackTintColor={accent}
        maximumTrackTintColor={colors.bgElev2}
        thumbTintColor={accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { ...type.h2, color: colors.text, flex: 1, paddingRight: spacing.md },
  pill: {
    minWidth: 48,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  pillText: { ...type.label },
  slider: { width: '100%', height: 32, marginTop: 4 },
});
