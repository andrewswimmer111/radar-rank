import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Template } from '@/data/types';
import { colors, radii, spacing, type } from '@/design/tokens';

type Props = { template: Template; index: number };

export function TemplateCard({ template, index }: Props) {
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(80 * index)}>
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
            <Text style={styles.emoji}>{template.emoji}</Text>
            <View style={styles.bottom}>
              <Text style={styles.label}>{template.label}</Text>
              <Text style={styles.blurb}>{template.blurb}</Text>
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
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.95 },
  card: {
    height: 220,
    padding: spacing.xl,
    borderRadius: radii.xl,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  emoji: { fontSize: 64, lineHeight: 70 },
  bottom: {},
  label: { ...type.h1, color: '#FFFFFF' },
  blurb: { ...type.body, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
