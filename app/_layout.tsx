// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { AuthRouter } from '@/components/auth-router';
import { SplashScreenController } from '@/components/splash-screen-controller';
import Providers from '@/providers';
export default function RootLayout() {
  return (
    <Providers>
      <SplashScreenController />
      <AuthRouter />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="invite" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" translucent={false} backgroundColor="#fff" />
    </Providers>
  )
}
