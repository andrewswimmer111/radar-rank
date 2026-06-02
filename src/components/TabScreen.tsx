import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsGearButton } from '@/components/SettingsGearButton';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { spacing, type } from '@/design/tokens';

// The three top-level tabs (Evaluations / Collections / Templates) all
// share the same chrome: SafeAreaView fill, a header row with the screen
// title + Settings gear, then a scrolling content list. This module pulls
// that chrome into reusable pieces so each tab file only describes what
// it lists.

export function TabScreen({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

export function TabContent({
  children,
  gap = spacing.md,
}: {
  children: ReactNode;
  // Defaults to row spacing for the typical list-of-cards tab. Tabs that
  // stack sections pass a larger value.
  gap?: number;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView
      contentContainerStyle={[
        styles.list,
        { gap, paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function TabHeader({ title }: { title: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.headerActions}>
        <SettingsGearButton />
      </View>
    </View>
  );
}

export function TabLoading() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.textDim} />
    </View>
  );
}

export function TabErrorBox({ message }: { message: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>Couldn&apos;t load.</Text>
      <Text style={styles.errorSub}>{message}</Text>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    errorText: { ...type.h3, color: t.colors.text },
    errorSub: { ...type.body, color: t.colors.textDim, textAlign: 'center' },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    title: { ...type.hero, color: t.colors.text },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    list: { paddingHorizontal: spacing.xl },
  });
