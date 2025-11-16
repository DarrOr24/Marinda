// app/onboarding/create.tsx
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { useCreateFamily } from '@/lib/families/families.hooks'


export default function CreateFamilyScreen() {
  const [name, setName] = useState('')
  const { mutate, isPending } = useCreateFamily()
  const router = useRouter()

  function onCreate() {
    if (!name.trim()) return
    mutate(name.trim(), {
      onSuccess: () => router.replace('/'),
      onError: (e: any) =>
        Alert.alert('Create failed', e?.message ?? 'Please try again.'),
    })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Family</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Family name" style={styles.input} />
      <TouchableOpacity style={styles.btn} onPress={onCreate} disabled={isPending || !name.trim()}>
        <Text style={styles.btnText}>{isPending ? 'Creating…' : 'Create'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 10, backgroundColor: '#fafafa' },
  btn: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
})
