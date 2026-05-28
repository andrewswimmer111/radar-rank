import * as Haptics from 'expo-haptics';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useThemeController,
  useThemedStyles,
  type Theme,
  type ThemeName,
} from '@/design/theme';
import { radii, spacing, type } from '@/design/tokens';
import type { SortMode } from '@/lib/stats';

type Props = {
  mode: SortMode;
  categories: readonly { key: string; label: string }[];
  onChange: (mode: SortMode) => void;
};

export function SortMenu({ mode, categories, onChange }: Props) {
  const { name } = useThemeController();
  const styles = useThemedStyles(makeStyles);
  const label = modeLabel(mode, categories);

  const onPress = () => {
    Haptics.selectionAsync().catch(() => {});
    openSortSheet({ categories, onChange, userInterfaceStyle: name });
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        hitSlop={10}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
        <Text style={styles.chipLabel}>Sort:</Text>
        <Text style={styles.chipValue} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.chipChevron}>⌄</Text>
      </Pressable>
    </View>
  );
}

function modeLabel(
  mode: SortMode,
  categories: readonly { key: string; label: string }[],
): string {
  switch (mode.kind) {
    case 'manual':
      return 'Manual';
    case 'alpha':
      return 'Alphabetical';
    case 'ovrDesc':
      return 'Highest OVR';
    case 'mostBalanced':
      return 'Most Balanced';
    case 'strongestIn': {
      const cat = categories.find((c) => c.key === mode.categoryKey);
      return cat ? `Strongest in ${cat.label}` : 'Strongest in…';
    }
  }
}

function openSortSheet({
  categories,
  onChange,
  userInterfaceStyle,
}: {
  categories: readonly { key: string; label: string }[];
  onChange: (mode: SortMode) => void;
  userInterfaceStyle: ThemeName;
}) {
  const baseOptions = [
    'Manual',
    'Alphabetical',
    'Highest OVR',
    'Most Balanced',
  ];
  const strongestLabel = 'Strongest in…';
  const showStrongest = categories.length > 0;

  if (Platform.OS === 'ios') {
    const options = showStrongest
      ? [...baseOptions, strongestLabel, 'Cancel']
      : [...baseOptions, 'Cancel'];
    const cancelIndex = options.length - 1;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Sort by',
        options,
        cancelButtonIndex: cancelIndex,
        userInterfaceStyle,
      },
      (index) => {
        if (index === undefined || index === cancelIndex) return;
        if (index === 0) onChange({ kind: 'manual' });
        else if (index === 1) onChange({ kind: 'alpha' });
        else if (index === 2) onChange({ kind: 'ovrDesc' });
        else if (index === 3) onChange({ kind: 'mostBalanced' });
        else if (index === 4 && showStrongest) {
          openCategorySheet({ categories, onChange, userInterfaceStyle });
        }
      },
    );
    return;
  }

  const buttons = [
    { text: 'Manual', onPress: () => onChange({ kind: 'manual' }) },
    { text: 'Alphabetical', onPress: () => onChange({ kind: 'alpha' }) },
    { text: 'Highest OVR', onPress: () => onChange({ kind: 'ovrDesc' }) },
    { text: 'Most Balanced', onPress: () => onChange({ kind: 'mostBalanced' }) },
    ...(showStrongest
      ? [
          {
            text: strongestLabel,
            onPress: () =>
              openCategorySheet({ categories, onChange, userInterfaceStyle }),
          },
        ]
      : []),
    { text: 'Cancel', style: 'cancel' as const },
  ];
  Alert.alert('Sort by', undefined, buttons);
}

function openCategorySheet({
  categories,
  onChange,
  userInterfaceStyle,
}: {
  categories: readonly { key: string; label: string }[];
  onChange: (mode: SortMode) => void;
  userInterfaceStyle: ThemeName;
}) {
  if (categories.length === 0) return;
  const labels = categories.map((c) => c.label);

  if (Platform.OS === 'ios') {
    const options = [...labels, 'Cancel'];
    const cancelIndex = labels.length;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Strongest in…',
        options,
        cancelButtonIndex: cancelIndex,
        userInterfaceStyle,
      },
      (index) => {
        if (index === undefined || index === cancelIndex) return;
        const cat = categories[index];
        if (cat) onChange({ kind: 'strongestIn', categoryKey: cat.key });
      },
    );
    return;
  }

  const buttons = [
    ...categories.map((c) => ({
      text: c.label,
      onPress: () =>
        onChange({ kind: 'strongestIn', categoryKey: c.key }),
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ];
  Alert.alert('Strongest in…', undefined, buttons);
}

const makeStyles = (t: Theme) => StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-end' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  chipLabel: { ...type.caption, color: t.colors.textMute },
  chipValue: { ...type.label, color: t.colors.text },
  chipChevron: { ...type.label, color: t.colors.textMute, marginLeft: -2 },
  pressed: { opacity: 0.7 },
});
