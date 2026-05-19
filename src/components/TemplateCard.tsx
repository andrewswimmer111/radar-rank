import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Template } from '@/data/types';
import { colors, radii, shadows, spacing, type } from '@/design/tokens';

type Props = { template: Template; index: number };

export function TemplateCard({ template, index }: Props) {
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(70 * index)}>
      <Link
        href={{ pathname: '/create/[templateId]', params: { templateId: template.id } }}
        asChild>
        <Pressable style={({ pressed }) => [styles.shadow, pressed && styles.pressed]}>
          <LinearGradient
            colors={[template.accent.start, template.accent.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}>
            <View style={styles.scrim} />

            <View style={styles.topRow}>
              <View style={styles.emojiBubble}>
                <Text style={styles.emoji}>{template.emoji}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {template.categories.length} STATS
                </Text>
              </View>
            </View>

            <View style={styles.bottom}>
              <Text style={styles.label}>{template.label}</Text>
              <Text style={styles.blurb} numberOfLines={2}>
                {template.blurb}
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Link>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radii.xl,
    ...shadows.card,
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  card: {
    height: 200,
    padding: spacing.xl,
    borderRadius: radii.xl,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  emojiBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  emoji: { fontSize: 28, lineHeight: 32 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  chipText: {
    ...type.eyebrow,
    color: 'rgba(255,255,255,0.95)',
  },
  bottom: {},
  label: { ...type.h1, color: '#FFFFFF' },
  blurb: {
    ...type.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
});
