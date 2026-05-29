import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { radii, spacing, type } from '@/design/tokens';

type Props = {
  label: string;
  value: number;
  accent: string;
  onChange: (next: number) => void;
  onCommit?: (next: number) => void;
};

// Custom equality on value/label/accent only — the parent re-creates the
// onChange/onCommit closures every render (they capture a category key),
// so default shallow memo would never skip a render. The callbacks just
// dispatch into the parent's current state setters, so the latest version
// is invoked from inside the closure each time regardless.
function propsEqual(a: Props, b: Props): boolean {
  return a.value === b.value && a.label === b.label && a.accent === b.accent;
}

export const SliderRow = memo(function SliderRow({
  label,
  value,
  accent,
  onChange,
  onCommit,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const handleComplete = useCallback(
    (next: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onCommit?.(next);
    },
    [onCommit],
  );

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
}, propsEqual);

const makeStyles = (t: Theme) => StyleSheet.create({
  row: { paddingVertical: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { ...type.h2, color: t.colors.text, flex: 1, paddingRight: spacing.md },
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
