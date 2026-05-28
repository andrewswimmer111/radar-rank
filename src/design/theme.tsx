import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setAppState } from '@/db/appState';

import { colors as darkColors, shadows as darkShadows } from './tokens';

export type ThemeName = 'dark' | 'light';

// Widen the `as const` literal types from tokens so alternate palettes can
// supply their own hex values while keeping the exact same key set.
type Palette = { [K in keyof typeof darkColors]: string };

type ShadowStyle = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};
type Shadows = { [K in keyof typeof darkShadows]: ShadowStyle };

// Light palette mirrors the dark palette's key set exactly (enforced by the
// `Palette` type). `accent` stays the brand lime in both themes; `onAccent`
// stays dark because the lime is light.
const lightColors: Palette = {
  bg: '#F4F4F7',
  bgElev: '#FFFFFF',
  bgElev2: '#ECECF1',
  bgElev3: '#E0E0E8',
  border: '#DCDCE4',
  borderSoft: '#EAEAF0',
  text: '#0B0B12',
  textDim: '#5A5A68',
  textMute: '#9A9AA8',
  accent: '#E8FF6B',
  accentSoft: '#C7E04A',
  onAccent: '#08080C',
  danger: '#E5484D',
  success: '#1F9D57',
};

const lightShadows: Shadows = {
  card: {
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  soft: {
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

export type Theme = {
  name: ThemeName;
  colors: Palette;
  shadows: Shadows;
};

// Module-constant theme objects: stable references per name, so
// `useThemedStyles` only recomputes when the active theme actually changes.
const THEMES: Record<ThemeName, Theme> = {
  dark: { name: 'dark', colors: darkColors, shadows: darkShadows },
  light: { name: 'light', colors: lightColors, shadows: lightShadows },
};

export const THEME_STATE_KEY = 'theme';

export function isThemeName(v: string | null | undefined): v is ThemeName {
  return v === 'dark' || v === 'light';
}

type ThemeContextValue = {
  theme: Theme;
  name: ThemeName;
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialName = 'dark',
  children,
}: {
  initialName?: ThemeName;
  children: ReactNode;
}) {
  const [name, setName] = useState<ThemeName>(initialName);

  const setTheme = useCallback((next: ThemeName) => {
    setName(next);
    setAppState(THEME_STATE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: THEMES[name], name, setTheme }),
    [name, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemeController(): {
  name: ThemeName;
  setTheme: (n: ThemeName) => void;
} {
  const { name, setTheme } = useThemeContext();
  return { name, setTheme };
}

// Each consumer defines a module-scope `makeStyles = (t) => StyleSheet.create(...)`
// and calls this hook. The factory is stable and the theme reference is stable
// per name, so styles are memoized and rebuild only on theme switch.
export function useThemedStyles<T>(factory: (t: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
