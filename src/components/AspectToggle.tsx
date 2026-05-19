import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, spacing, type } from '@/design/tokens';

export type AspectRatio = 'square' | 'story';

type Props = { value: AspectRatio; onChange: (next: AspectRatio) => void };

const OPTIONS: { id: AspectRatio; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'story', label: 'Story' },
];

const SPRING = { damping: 22, stiffness: 260, mass: 0.7 } as const;

export function AspectToggle({ value, onChange }: Props) {
  const [optWidth, setOptWidth] = useState(88);
  const activeIdx = OPTIONS.findIndex((o) => o.id === value);
  const slideX = useSharedValue(0);

  useEffect(() => {
    slideX.value = withSpring(activeIdx * (optWidth + 2), SPRING);
  }, [activeIdx, optWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pill, { width: optWidth }, pillStyle]} />
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
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              setOptWidth((prev) => (prev === w ? prev : w));
            }}
            style={styles.option}>
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
    padding: 3,
    backgroundColor: colors.bgElev,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 2,
  },
  pill: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElev3,
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radii.pill,
    minWidth: 88,
    alignItems: 'center',
  },
  text: { ...type.label, color: colors.textMute, letterSpacing: 0.8 },
  textActive: { color: colors.text },
});
