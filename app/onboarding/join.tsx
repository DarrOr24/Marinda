// app/onboarding/join.tsx
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput } from 'react-native'

import { Button, Screen } from '@/components/ui'
import { useJoinFamily } from '@/lib/families/families.hooks'
import type { Role } from '@/lib/members/members.types'
import { trimOrNull } from '@/utils/format.utils'


export default function JoinFamilyScreen() {
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [role] = useState<Role>('ADULT')
  const { mutate, isPending } = useJoinFamily()
  const router = useRouter()

  function onJoin() {
    const familyCode = code.trim()
    if (!familyCode) return

    mutate(
      { code: familyCode, role, nickname: trimOrNull(nickname) },
      {
        onSuccess: () => router.replace('/'),
        onError: (e: any) =>
          Alert.alert('Join failed', e?.message ?? 'Please try again.'),
      }
    )
  }

  return (
    <Screen withBackground={false}>
      <Text style={styles.title}>Join with Code</Text>

      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        placeholder="Enter family code"
        style={styles.input}
      />

      <TextInput
        value={nickname}
        onChangeText={setNickname}
        placeholder="Your nickname (optional)"
        style={styles.input}
      />

      <Button
        title={isPending ? 'Joining…' : 'Join'}
        size="lg"
        onPress={onJoin}
        disabled={isPending || !code.trim()}
        fullWidth
        bold
      />

      <Button
        title="Back"
        type="ghost"
        size="lg"
        onPress={() => router.replace('/onboarding/create-or-join')}
        fullWidth
        bold
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
})
