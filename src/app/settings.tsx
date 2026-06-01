import Constants from 'expo-constants';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/HeaderBar';
import { deleteAllData, publishAll } from '@/db/hooks';
import {
  useTheme,
  useThemeController,
  useThemedStyles,
  type Theme,
} from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import {
  applyBackup,
  exportBackupToFile,
  pickBackupFile,
  type BackupV1,
  type RestoreMode,
} from '@/lib/backup';
import { confirmDestructive } from '@/lib/dialog';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { name: themeName, setTheme } = useThemeController();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const version = Constants.expoConfig?.version ?? '—';
  const build = Constants.expoConfig?.ios?.buildNumber ?? null;
  const versionText = build ? `${version} (${build})` : version;

  const onExport = async () => {
    if (busy) return;
    setBusy('export');
    try {
      await exportBackupToFile();
    } catch (e) {
      Alert.alert('Export failed', msg(e));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async (backup: BackupV1, mode: RestoreMode) => {
    setBusy('import');
    try {
      await applyBackup(backup, mode);
      publishAll();
      Alert.alert('Restore complete', `Imported with ${mode} mode.`);
    } catch (e) {
      Alert.alert('Import failed', msg(e));
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    if (busy) return;
    let picked: BackupV1 | null;
    try {
      picked = await pickBackupFile();
    } catch (e) {
      Alert.alert('Import failed', msg(e));
      return;
    }
    if (!picked) return;
    const backup = picked;
    Alert.alert(
      'Restore backup',
      'Merge adds items missing on this device. Replace wipes current data first.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Merge', onPress: () => runImport(backup, 'merge') },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => runImport(backup, 'replace'),
        },
      ],
    );
  };

  const onDeleteAll = () => {
    confirmDestructive({
      title: 'Delete all data?',
      message:
        'Removes every collection, custom template, and evaluation on this device. Built-in templates remain. This cannot be undone.',
      confirmLabel: 'Delete everything',
      onConfirm: async () => {
        try {
          await deleteAllData();
          Alert.alert('Done', 'All your data has been deleted.');
        } catch (e) {
          Alert.alert('Delete failed', msg(e));
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar title="Settings" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.rowTitle}>Theme</Text>
            <View style={styles.segment}>
              <SegmentButton
                label="Dark"
                active={themeName === 'dark'}
                onPress={() => setTheme('dark')}
              />
              <SegmentButton
                label="Light"
                active={themeName === 'light'}
                onPress={() => setTheme('light')}
              />
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Backup</Text>
        <View style={styles.card}>
          <ActionRow
            title="Back up to file"
            subtitle="Export all your data as JSON"
            onPress={onExport}
            busy={busy === 'export'}
          />
          <View style={styles.divider} />
          <ActionRow
            title="Restore from file"
            subtitle="Merge or replace from a backup"
            onPress={onImport}
            busy={busy === 'import'}
          />
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.rowTitle}>Version</Text>
            <Text style={styles.rowValue}>{versionText}</Text>
          </View>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <Pressable
            onPress={onDeleteAll}
            style={({ pressed: p }) => [styles.row, p && pressed.soft]}>
            <Text style={styles.dangerText}>Delete all my data</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.segBtn, active && styles.segBtnActive]}>
      <Text style={[styles.segText, active && styles.segTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionRow({
  title,
  subtitle,
  onPress,
  busy,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  busy: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed: p }) => [styles.row, p && pressed.soft]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.textDim} />
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: t.colors.textMute,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: t.colors.bgElev,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 56,
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    minHeight: 56,
    gap: spacing.md,
  },
  rowTitle: { ...type.h3, color: t.colors.text },
  rowSubtitle: { ...type.caption, color: t.colors.textDim, marginTop: 2 },
  rowValue: { ...type.body, color: t.colors.textDim },
  chevron: { ...type.h2, color: t.colors.textMute },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.colors.border,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: t.colors.bgElev2,
    borderRadius: radii.pill,
    padding: 3,
    gap: 3,
  },
  segBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  segBtnActive: { backgroundColor: t.colors.accent },
  segText: { ...type.label, color: t.colors.textDim },
  segTextActive: { color: t.colors.onAccent },
  dangerCard: { marginTop: spacing.xl },
  dangerText: { ...type.h3, color: t.colors.danger },
});
