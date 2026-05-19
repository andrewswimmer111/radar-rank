import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/design/tokens';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RadarRank</Text>
      <Text style={styles.subtitle}>boot ok — fonts loaded</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.hero, color: colors.text },
  subtitle: { ...type.body, color: colors.textDim, marginTop: 8 },
});
