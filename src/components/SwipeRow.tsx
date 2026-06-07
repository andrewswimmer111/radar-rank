import * as Haptics from 'expo-haptics';
import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { useThemedStyles, type Theme } from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import { useStarterPrefs } from '@/lib/starterPrefs';

// Wraps a list row so a left swipe reveals Delete and a right swipe
// reveals Pin/Unpin — Outlook-style: swipe to expose, tap to commit. Pin
// persists via shared prefs; delete is delegated to the caller. Omit
// onDelete to render a pin-only row (used for starters, which can't be
// deleted).
//
// `leftAction` swaps the right-swipe affordance away from pin for callers
// where pinning makes no sense (e.g. voter rows on the voters list).
// Caller controls the label, press handler, and whether to render at all
// by omitting the prop.
export type SwipeRowAction = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

export function SwipeRow({
  id,
  onDelete,
  leftAction,
  children,
}: {
  id: string;
  onDelete?: () => void;
  leftAction?: SwipeRowAction;
  children: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const ref = useRef<Swipeable>(null);
  const { togglePinned, pinned } = useStarterPrefs();
  const isPinned = pinned.has(id);

  const onPin = () => {
    Haptics.selectionAsync().catch(() => {});
    togglePinned(id);
    ref.current?.close();
  };

  const onLeftActionPress = () => {
    if (!leftAction) return;
    Haptics.selectionAsync().catch(() => {});
    ref.current?.close();
    leftAction.onPress();
  };

  const onDeletePress = () => {
    if (!onDelete) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
    ref.current?.close();
    onDelete();
  };

  return (
    <Swipeable
      ref={ref}
      friction={1.6}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={48}
      rightThreshold={onDelete ? 48 : 9999}
      renderLeftActions={() => (
        <View style={styles.leftWrap}>
          {leftAction ? (
            <Pressable
              onPress={onLeftActionPress}
              accessibilityRole="button"
              accessibilityLabel={
                leftAction.accessibilityLabel ?? leftAction.label
              }
              style={({ pressed: p }) => [styles.pinPanel, p && pressed.soft]}>
              <Text style={styles.pinText}>{leftAction.label}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onPin}
              accessibilityRole="button"
              accessibilityLabel={isPinned ? 'Unpin' : 'Pin'}
              style={({ pressed: p }) => [styles.pinPanel, p && pressed.soft]}>
              <Text style={styles.pinText}>{isPinned ? 'Unpin' : 'Pin'}</Text>
            </Pressable>
          )}
        </View>
      )}
      renderRightActions={
        onDelete
          ? () => (
              <View style={styles.rightWrap}>
                <Pressable
                  onPress={onDeletePress}
                  accessibilityRole="button"
                  accessibilityLabel="Delete"
                  style={({ pressed: p }) => [
                    styles.deletePanel,
                    p && pressed.soft,
                  ]}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            )
          : undefined
      }>
      {children}
    </Swipeable>
  );
}

const PANEL_WIDTH = 84;

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    leftWrap: {
      width: PANEL_WIDTH,
      justifyContent: 'center',
      paddingRight: spacing.sm,
    },
    rightWrap: {
      width: PANEL_WIDTH,
      justifyContent: 'center',
      paddingLeft: spacing.sm,
    },
    pinPanel: {
      flex: 1,
      backgroundColor: t.colors.accent,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinText: { ...type.label, color: t.colors.onAccent },
    deletePanel: {
      flex: 1,
      backgroundColor: t.colors.danger,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteText: { ...type.label, color: '#fff' },
  });
