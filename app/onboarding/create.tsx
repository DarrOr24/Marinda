// app/onboarding/create.tsx
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput } from 'react-native'

import { Button, Screen } from '@/components/ui'
import { useCreateFamily } from '@/lib/families/families.hooks'
import { trimOrNull } from '@/utils/format.utils'


export default function CreateFamilyScreen() {
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const { mutate, isPending } = useCreateFamily()
  const router = useRouter()

  function onCreate() {
    const familyName = name.trim()
    if (!familyName) return

    mutate(
      { name: familyName, nickname: trimOrNull(nickname) },
      {
        onSuccess: () => router.replace('/onboarding/choose-plan'),
        onError: (e: any) =>
          Alert.alert('Create failed', e?.message ?? 'Please try again.'),
      }
    )
  }

  return (
    <Screen withBackground={false}>
      <Text style={styles.title}>Create Family</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Family name"
        style={styles.input}
      />

      <TextInput
        value={nickname}
        onChangeText={setNickname}
        placeholder="Your nickname (optional)"
        style={styles.input}
      />

      <Button
        title={isPending ? 'Creating…' : 'Create'}
        size="lg"
        onPress={onCreate}
        disabled={isPending || !name.trim()}
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
