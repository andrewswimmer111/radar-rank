import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  useThemeController,
  useThemedStyles,
  type Theme,
  type ThemeName,
} from '@/design/theme';
import { pressed, radii, spacing, type } from '@/design/tokens';
import { showActionSheet } from '@/lib/dialog';
import type { SortMode } from '@/lib/stats';

type Categories = readonly { key: string; label: string }[];

type Props = {
  mode: SortMode;
  categories: Categories;
  onChange: (mode: SortMode) => void;
};

export function SortMenu({ mode, categories, onChange }: Props) {
  const { name } = useThemeController();
  const styles = useThemedStyles(makeStyles);
  const label = modeLabel(mode, categories);

  const onPress = () => {
    Haptics.selectionAsync().catch(() => {});
    openSortSheet({ categories, onChange, themeName: name });
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        hitSlop={10}
        style={({ pressed: p }) => [styles.chip, p && pressed.soft]}>
        <Text style={styles.chipLabel}>Sort:</Text>
        <Text style={styles.chipValue} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.chipChevron}>⌄</Text>
      </Pressable>
    </View>
  );
}

function modeLabel(mode: SortMode, categories: Categories): string {
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

function openSortSheet(opts: {
  categories: Categories;
  onChange: (mode: SortMode) => void;
  themeName: ThemeName;
}): void {
  const { categories, onChange, themeName } = opts;
  const actions = [
    { label: 'Manual', onPress: () => onChange({ kind: 'manual' }) },
    { label: 'Alphabetical', onPress: () => onChange({ kind: 'alpha' }) },
    { label: 'Highest OVR', onPress: () => onChange({ kind: 'ovrDesc' }) },
    { label: 'Most Balanced', onPress: () => onChange({ kind: 'mostBalanced' }) },
  ];
  if (categories.length > 0) {
    actions.push({
      label: 'Strongest in…',
      onPress: () => openCategorySheet({ categories, onChange, themeName }),
    });
  }
  showActionSheet({ title: 'Sort by', actions, themeName });
}

function openCategorySheet(opts: {
  categories: Categories;
  onChange: (mode: SortMode) => void;
  themeName: ThemeName;
}): void {
  const { categories, onChange, themeName } = opts;
  if (categories.length === 0) return;
  showActionSheet({
    title: 'Strongest in…',
    actions: categories.map((c) => ({
      label: c.label,
      onPress: () => onChange({ kind: 'strongestIn', categoryKey: c.key }),
    })),
    themeName,
  });
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
});
