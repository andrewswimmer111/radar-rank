import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { colors, spacing, type } from '@/design/tokens';

export default function CompareScreen() {
  const { ids } = useLocalSearchParams<{ id: string; ids?: string }>();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="Compare" />
      <View style={styles.center}>
        <Text style={styles.muted}>Compare overlay arrives in plan-6.</Text>
        <Text style={styles.muted}>ids: {ids ?? '(none)'}</Text>
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
    padding: spacing.xl,
    gap: spacing.sm,
  },
  muted: { ...type.body, color: colors.textDim },
});
