import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, type } from '@/design/tokens';

export default function EvaluationsTab() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.eyebrow}>Evaluations</Text>
        <Text style={styles.title}>Coming soon</Text>
        <Text style={styles.body}>
          Your evaluations will live here once the creation flow lands.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  title: { ...type.hero, color: colors.text },
  body: {
    ...type.body,
    color: colors.textDim,
    textAlign: 'center',
    maxWidth: 320,
  },
});
