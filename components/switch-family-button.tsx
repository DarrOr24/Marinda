// components/switch-family-button.tsx
import { useRouter } from 'expo-router'
import { Text, TouchableOpacity } from 'react-native'

export function SwitchFamilyButton() {
  const router = useRouter()
  return (
    <TouchableOpacity onPress={() => router.push('/onboarding/select-family')}>
      <Text style={{ color: '#2563eb', fontWeight: '600' }}>Switch family</Text>
    </TouchableOpacity>
  )
}
