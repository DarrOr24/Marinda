// app/settings/_layout.tsx
import { Stack } from 'expo-router'

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="email" />
      <Stack.Screen name="member" />
      <Stack.Screen name="family" />
      <Stack.Screen name="kid-mode-pin" />
      <Stack.Screen name="add-member" />
      <Stack.Screen name="add-member/sms-invite" />
      <Stack.Screen name="add-member/add-kid" />
      <Stack.Screen name="billing" />
    </Stack>
  )
}
