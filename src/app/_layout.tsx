import { type ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorScreen } from '@/components/ErrorScreen';
import { initDb } from '@/db';
import { getAppState } from '@/db/appState';
import {
  isThemeName,
  THEME_STATE_KEY,
  ThemeProvider,
  useTheme,
  type ThemeName,
} from '@/design/theme';
import { colors } from '@/design/tokens';
import { useAppFonts } from '@/design/useAppFonts';
import { StarterPrefsProvider } from '@/lib/starterPrefs';

SplashScreen.preventAutoHideAsync().catch(() => {});

type DbState = 'loading' | 'ready' | 'error';

// Caught by expo-router for render-phase errors anywhere below this layout.
// At this point the layout (and its providers) have unmounted, so we render
// the provider-independent ErrorScreen. `retry` re-mounts the route subtree.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ErrorScreen
      title="Something went wrong"
      message={error.message}
      onRetry={() => {
        void retry();
      }}
    />
  );
}

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const [dbState, setDbState] = useState<DbState>('loading');
  const [dbError, setDbError] = useState('');
  const [themeName, setThemeName] = useState<ThemeName>('dark');

  const initialize = useCallback(() => {
    setDbState('loading');
    void (async () => {
      try {
        await initDb();
      } catch (e) {
        console.error('[layout] DB init failed:', e);
        setDbError(e instanceof Error ? e.message : String(e));
        setDbState('error');
        return;
      }
      // Load persisted theme before first paint so there's no flash. A read
      // failure is non-fatal — we fall back to the default dark theme.
      try {
        const stored = await getAppState(THEME_STATE_KEY);
        if (isThemeName(stored)) setThemeName(stored);
      } catch {
        // ignore
      }
      setDbState('ready');
    })();
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (fontsLoaded && dbState !== 'loading') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, dbState]);

  // During the very first load the native splash covers this; the dark fill
  // + spinner only become visible on the retry path after an error.
  if (!fontsLoaded || dbState === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={colors.textDim} />
      </View>
    );
  }

  if (dbState === 'error') {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <ErrorScreen
            title="Something went wrong"
            message={
              dbError ||
              'RadarRank had trouble loading its database. Restarting the app may help.'
            }
            onRetry={initialize}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <ThemeProvider initialName={themeName}>
      <StarterPrefsProvider>
        <ThemedRoot />
      </StarterPrefsProvider>
    </ThemeProvider>
  );
}

function ThemedRoot() {
  const theme = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg },
            animation: 'slide_from_right',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
