import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
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
  // Bump a key on every focus *after* the initial mount so the rows'
  // FadeInDown entering animations replay each time the user comes back
  // to this tab. Skipping the first focus avoids a double-mount glitch
  // where the initial render would animate, get unmounted, and animate
  // again.
  const [focusKey, setFocusKey] = useState(0);
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      setFocusKey((k) => k + 1);
    }, []),
  );
  return (
    <ScrollView
      contentContainerStyle={[
        styles.list,
        { paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}>
      <View key={focusKey} style={{ gap }}>
        {children}
      </View>
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

export function Section({
  title,
  caption,
  onHide,
  children,
}: {
  title: string;
  caption: string;
  // When provided, renders a small "Hide" chip on the section header that
  // calls this on tap. Used to dismiss the Starters section per-tab.
  onHide?: () => void;
  children: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitles}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCaption}>{caption}</Text>
        </View>
        {onHide && (
          <Pressable
            onPress={onHide}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Hide ${title} section`}
            style={({ pressed: p }) => [styles.hideChip, p && pressed.soft]}>
            <Text style={styles.hideChipText}>Hide</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
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
    section: { gap: spacing.md },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    sectionTitles: { flex: 1, gap: 4 },
    sectionTitle: {
      ...type.eyebrow,
      color: t.colors.accent,
      textTransform: 'uppercase',
    },
    sectionCaption: { ...type.caption, color: t.colors.textMute },
    sectionBody: { gap: spacing.md },
    hideChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: t.colors.bgElev,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
    },
    hideChipText: { ...type.label, color: t.colors.textDim },
  });
