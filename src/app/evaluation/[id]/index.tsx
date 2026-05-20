import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { useEvaluation } from '@/db/hooks';
import { colors, spacing, type } from '@/design/tokens';

export default function EvaluationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: evaluation } = useEvaluation(id);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="Evaluation" />
      <View style={styles.center}>
        <Text style={styles.eyebrow}>Plan-11</Text>
        <Text style={styles.title}>
          {evaluation?.title ?? 'Evaluation'}
        </Text>
        <Text style={styles.muted}>Detail screen coming soon</Text>
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
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  title: { ...type.h1, color: colors.text },
  muted: { ...type.body, color: colors.textDim },
});
