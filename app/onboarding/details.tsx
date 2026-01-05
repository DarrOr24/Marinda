// app/onboarding/details.tsx
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'

import { ChipSelector } from '@/components/chip-selector'
import { DatePicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useProfile, useUpdateProfile } from '@/lib/profiles/profiles.hooks'

const GENDER_OPTIONS = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
]

function isValidDate(s: string) {
  if (!s.trim()) return true
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim())
}

export default function OnboardingDetails() {
  const { profileId } = useAuthContext()
  const profile = useProfile(profileId ?? undefined)
  const updateProfile = useUpdateProfile()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState('')

  const [didInit, setDidInit] = useState(false)
  useEffect(() => {
    if (didInit) return
    const p = profile.data
    if (!p) return

    setFirstName(p.first_name ?? '')
    setLastName(p.last_name ?? '')
    setGender((p.gender as any) ?? null)
    setBirthDate(p.birth_date ?? '')
    setDidInit(true)
  }, [didInit, profile.data])

  const canContinue =
    !!profileId &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    gender !== null &&
    birthDate.trim().length > 0 &&
    !updateProfile.isPending

  function onContinue() {
    if (!profileId) {
      Alert.alert('Not ready', 'Please sign in again.')
      return
    }

    updateProfile.mutate(
      {
        profileId,
        updates: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gender: gender ?? null,
          birth_date: birthDate.trim() || null,
        },
      },
      {
        onSuccess: () => {
          // After details -> family hub
          router.replace('/onboarding/create-or-join')
        },
        onError: (e: any) => {
          Alert.alert('Save failed', e?.message ?? 'Please try again.')
        },
      },
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.subtitle}>You can always change this later in settings.</Text>

      <Text style={styles.label}>First Name</Text>
      <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />

      <Text style={styles.label}>Last Name</Text>
      <TextInput value={lastName} onChangeText={setLastName} style={styles.input} />

      <Text style={styles.label}>Gender</Text>
      <ChipSelector
        options={GENDER_OPTIONS}
        value={gender}
        onChange={setGender}
        style={{ marginTop: 4 }}
      />

      <Text style={styles.label}>Birth Date</Text>
      <DatePicker
        value={birthDate}
        onChange={setBirthDate}
        placeholder="YYYY-MM-DD"
        title="Pick your birth date"
        enableYearPicker
        yearPickerRange={{ past: 120, future: 0 }}
      />

      <Button
        title={updateProfile.isPending ? 'Saving…' : 'Continue'}
        onPress={onContinue}
        disabled={!canContinue}
        fullWidth
        bold
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 14, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569' },
  label: { fontSize: 14, fontWeight: '600', color: '#334155' },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 16,
    color: '#0f172a',
  },
  error: { color: '#ef4444', fontWeight: '600' },
})
