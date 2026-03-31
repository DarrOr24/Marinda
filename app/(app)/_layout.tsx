import { Stack } from 'expo-router'
import React from 'react'

import { AppHeaderProvider } from '@/components/app-header'

export default function AppLayout() {
  return (
    <AppHeaderProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profiles/[id]" />
        <Stack.Screen name="getting-started" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="chores/info" />
        <Stack.Screen name="chores/settings" />
        <Stack.Screen name="wishlist/info" />
        <Stack.Screen name="wishlist/settings" />
        <Stack.Screen name="announcements/info" />
        <Stack.Screen name="announcements/settings" />
        <Stack.Screen name="shopping/settings" />
        <Stack.Screen name="lists/settings" />
      </Stack>
    </AppHeaderProvider>
  )
}
