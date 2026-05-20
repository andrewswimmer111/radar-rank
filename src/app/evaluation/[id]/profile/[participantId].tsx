import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { useParticipants } from '@/db/hooks';
import { colors, spacing, type } from '@/design/tokens';

export default function ProfileScreen() {
  const { id, participantId } = useLocalSearchParams<{
    id: string;
    participantId: string;
  }>();
  const { data: participants } = useParticipants(id);
  const participant = participants?.find((p) => p.id === participantId);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="Profile" />
      <View style={styles.center}>
        <Text style={styles.eyebrow}>Plan-13</Text>
        <Text style={styles.title}>{participant?.name ?? 'Profile'}</Text>
        <Text style={styles.muted}>Score editor coming soon</Text>
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
