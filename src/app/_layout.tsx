import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDb } from '@/db';
import { colors } from '@/design/tokens';
import { useAppFonts } from '@/design/useAppFonts';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((e) => {
        console.error('[layout] DB init failed:', e);
        setDbReady(true);
      });
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
