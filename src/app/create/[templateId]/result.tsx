import { useCanvasRef } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AspectToggle, type AspectRatio } from '@/components/AspectToggle';
import { HeaderBar } from '@/components/HeaderBar';
import { RadarCard } from '@/components/RadarCard';
import { getTemplate } from '@/data/templates';
import { colors, radii, spacing, type } from '@/design/tokens';
import { exportFilename, snapshotCanvasToFile } from '@/lib/exportCard';
import { useDraft } from '@/state/DraftProvider';

const ASPECT_RATIO: Record<AspectRatio, number> = { square: 1, story: 16 / 9 };
const EXPORT_WIDTH = 1080;

export default function ResultScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const { draft } = useDraft();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const [aspect, setAspect] = useState<AspectRatio>('square');
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const exportRef = useCanvasRef();

  const template = templateId ? getTemplate(templateId) : undefined;

  if (!template || !draft || draft.templateId !== templateId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HeaderBar title="Result" />
        <View style={styles.center}>
          <Text style={styles.muted}>No draft loaded</Text>
        </View>
      </SafeAreaView>
    );
  }

  const reservedV = 240 + insets.top + insets.bottom;
  const availW = SCREEN_W - spacing.xl * 2;
  const availH = SCREEN_H - reservedV;
  const ratio = ASPECT_RATIO[aspect];
  const cardW = Math.min(availW, availH / ratio);
  const cardH = cardW * ratio;
  const exportH = EXPORT_WIDTH * ratio;

  const onEdit = () => {
    router.push({
      pathname: '/create/[templateId]',
      params: { templateId: template.id },
    });
  };

  const writeExportFile = async () => {
    return snapshotCanvasToFile(exportRef, exportFilename(template.id, aspect));
  };

  const onSave = async () => {
    if (busy) return;
    setBusy('save');
    try {
      const uri = await writeExportFile();
      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Saved', 'Card saved to Photos.');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert("Couldn't save", describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    if (busy) return;
    setBusy('share');
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable on this device.');
        return;
      }
      const uri = await writeExportFile();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your card' });
    } catch (err) {
      Alert.alert("Couldn't share", describeError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar title={template.label} />
      <Animated.View
        key={aspect}
        entering={FadeIn.duration(360)}
        style={styles.previewArea}>
        <RadarCard
          template={template}
          draft={draft}
          width={cardW}
          height={cardH}
        />
      </Animated.View>

      {/* Offscreen export-resolution card; ref is snapshotted on demand. */}
      <View style={styles.offscreen} pointerEvents="none">
        <RadarCard
          template={template}
          draft={draft}
          width={EXPORT_WIDTH}
          height={exportH}
          canvasRef={exportRef}
        />
      </View>

      <Animated.View
        entering={FadeInDown.duration(420).delay(120)}
        style={[styles.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
        <AspectToggle value={aspect} onChange={setAspect} />

        <View style={styles.actionRow}>
          <Pressable
            onPress={onSave}
            disabled={!!busy}
            style={({ pressed }) => [
              styles.action,
              pressed && styles.pressed,
              !!busy && styles.actionBusy,
            ]}>
            {busy === 'save' ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.actionText}>Save</Text>
            )}
          </Pressable>
          <Pressable
            onPress={onShare}
            disabled={!!busy}
            style={({ pressed }) => [
              styles.action,
              styles.actionPrimary,
              pressed && styles.pressed,
              !!busy && styles.actionBusy,
            ]}>
            {busy === 'share' ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={[styles.actionText, styles.actionPrimaryText]}>Share</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.6 }]}>
          <Text style={styles.editText}>← Edit</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Unknown error.';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: colors.textDim },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  offscreen: {
    position: 'absolute',
    top: -20000,
    left: -20000,
    opacity: 0,
  },
  controls: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  action: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElev,
    minHeight: 56,
  },
  actionPrimary: { backgroundColor: colors.accent },
  actionBusy: { opacity: 0.7 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  actionText: { ...type.h2, color: colors.text },
  actionPrimaryText: { color: colors.bg },
  editLink: { alignSelf: 'center', padding: spacing.sm },
  editText: { ...type.label, color: colors.textDim },
});
