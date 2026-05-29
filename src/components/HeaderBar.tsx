import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles, type Theme } from '@/design/theme';
import { spacing, type } from '@/design/tokens';

type Props = { title?: string; right?: React.ReactNode };

export function HeaderBar({ title, right }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.bar}>
      <Pressable
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
        <Text style={styles.backText}>←</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: t.colors.bgElev,
  },
  backText: { color: t.colors.text, fontSize: 18, lineHeight: 20 },
  title: { ...type.label, color: t.colors.textDim, flex: 1, textAlign: 'center' },
  right: {
    minWidth: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
