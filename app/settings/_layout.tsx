// app/settings/_layout.tsx
import { Stack } from 'expo-router'

import { rootNavigatorScreenOptions } from '@/app/_layout'


export default function SettingsLayout() {
  return (
    <Stack screenOptions={rootNavigatorScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="account" options={{ title: 'Account Settings' }} />
      <Stack.Screen name="email" options={{ title: 'Email Settings' }} />
      <Stack.Screen name="member" options={{ title: 'My Family Member Settings' }} />
      <Stack.Screen name="family" options={{ title: 'Family Settings' }} />
      <Stack.Screen name="billing" options={{ title: 'Billing Settings' }} />
    </Stack>
  )
}
