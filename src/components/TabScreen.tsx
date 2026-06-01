import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsGearButton } from '@/components/SettingsGearButton';
import { useTheme, useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';

// The three top-level tabs (Evaluations / Collections / Templates) all
// share the same chrome: SafeAreaView fill, a header row with the screen
// title + Settings gear + an optional "+ New" pill, then a scrolling
// content list. This module pulls that chrome into reusable pieces so
// each tab file only describes what it lists.

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
  // Defaults to row spacing for the typical list-of-cards tab. The Templates
  // tab passes a larger value because it stacks sections instead of rows.
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

// Use when the tab has zero content. Renders only the gear so users can
// still reach Settings without a list header.
export function TabBareTopBar() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.topBar}>
      <SettingsGearButton />
    </View>
  );
}

export function TabHeader({
  title,
  onNewPress,
}: {
  title: string;
  onNewPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.headerActions}>
        <SettingsGearButton />
        {onNewPress && (
          <Pressable
            onPress={onNewPress}
            hitSlop={10}
            style={({ pressed: p }) => [styles.newBtn, p && pressed.default]}>
            <Text style={styles.newBtnText}>+ New</Text>
          </Pressable>
        )}
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
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
    },
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
    newBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: t.colors.bgElev,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
    },
    newBtnText: { ...type.label, color: t.colors.text },
    list: { paddingHorizontal: spacing.xl },
  });
