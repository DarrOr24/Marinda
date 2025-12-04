// app/settings/index.tsx
import { Redirect } from 'expo-router'

export default function SettingsIndex() {
  return <Redirect href="/settings/account" />
}