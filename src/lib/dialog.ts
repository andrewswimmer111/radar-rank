import { ActionSheetIOS, Alert, Platform } from 'react-native';

import type { ThemeName } from '@/design/theme';

// Cross-platform dialog helpers. The app shows two recurring shapes:
//
//   1. An action sheet with several picks (Cancel is always implicit).
//      iOS gets the native sheet; Android falls back to Alert buttons.
//
//   2. A destructive confirmation — a title, optional body, single
//      red confirm button, Cancel. Same look on both platforms via
//      Alert.alert (a real action sheet would be visual overkill).
//
// Centralizing them removes the Platform.OS forks that previously lived
// inline in five screens, each with slightly different cancel/destructive
// index arithmetic.

export type SheetAction = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

export function showActionSheet(opts: {
  title?: string;
  message?: string;
  actions: SheetAction[];
  themeName: ThemeName;
}): void {
  const { title, message, actions, themeName } = opts;

  if (Platform.OS === 'ios') {
    const options = [...actions.map((a) => a.label), 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    // iOS supports only a single destructiveButtonIndex. Use the last
    // destructive entry — by convention destructive actions sit at the
    // bottom of the sheet and the most-dangerous one is the visual red.
    let destructiveButtonIndex: number | undefined;
    for (let i = 0; i < actions.length; i++) {
      if (actions[i].destructive) destructiveButtonIndex = i;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
        userInterfaceStyle: themeName,
      },
      (index) => {
        if (index === undefined || index === cancelButtonIndex) return;
        actions[index]?.onPress();
      },
    );
    return;
  }

  const buttons = [
    ...actions.map((a) => ({
      text: a.label,
      style: a.destructive ? ('destructive' as const) : undefined,
      onPress: a.onPress,
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ];
  Alert.alert(title ?? '', message, buttons);
}

export function confirmDestructive(opts: {
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
}): void {
  Alert.alert(opts.title, opts.message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: opts.confirmLabel,
      style: 'destructive',
      onPress: opts.onConfirm,
    },
  ]);
}
