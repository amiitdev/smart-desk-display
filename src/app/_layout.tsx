import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureNotifications } from '@/services/notifications';
import { colors } from '@/theme';
import { DSEG_FONT } from '@/theme/fonts';

// Keep the native splash visible until the digital clock font is ready.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // A desk display should stay awake while it is on screen. When the user leaves
  // the app Android restores the normal screen timeout automatically.
  useKeepAwake();

  const [fontsLoaded, fontError] = useFonts({
    DSEG7: DSEG_FONT,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      void configureNotifications();
    }
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      />
    </SafeAreaProvider>
  );
}
