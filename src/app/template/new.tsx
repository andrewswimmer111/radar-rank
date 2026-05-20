import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { colors, spacing, type } from '@/design/tokens';

export default function NewTemplate() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="New template" />
      <View style={styles.center}>
        <Text style={styles.eyebrow}>Plan-9</Text>
        <Text style={styles.title}>
          {from ? 'Duplicate flow coming soon' : 'Editor coming soon'}
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
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.textMute,
    textTransform: 'uppercase',
  },
  title: { ...type.h1, color: colors.text },
});
