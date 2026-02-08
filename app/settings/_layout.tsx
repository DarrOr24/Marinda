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
      <Stack.Screen name="add-member" options={{ title: 'Add Member' }} />
      <Stack.Screen name="add-member/sms-invite" options={{ title: 'Invite by SMS' }} />
      <Stack.Screen name="add-member/add-kid" options={{ title: 'Add kid (no phone)' }} />
      <Stack.Screen name="billing" options={{ title: 'Billing Settings' }} />
    </Stack>
  )
}
