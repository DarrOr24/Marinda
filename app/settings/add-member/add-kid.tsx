// app/settings/add-member/add-kid.tsx
import { useState } from 'react'
import { StyleSheet, Text, TextInput } from 'react-native'
import { useRouter } from 'expo-router'

import { ChipSelector } from '@/components/chip-selector'
import { DatePicker } from '@/components/date-picker'
import { Button, Screen, Section } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useCreateKidMember, useFamily } from '@/lib/families/families.hooks'
import { ROLE_OPTIONS, type Role } from '@/lib/members/members.types'
import { GENDER_OPTIONS, type Gender } from '@/lib/profiles/profiles.types'


const KID_ROLE_OPTIONS = ROLE_OPTIONS.filter((o) =>
  o.value === 'TEEN' || o.value === 'CHILD'
)

export default function AddKidWithoutPhoneScreen() {
  const router = useRouter()
  const { member } = useAuthContext()
  const familyId = member?.family_id

  const { family } = useFamily(familyId ?? undefined)
  const familyName = family.data?.name ?? null

  const [firstName, setFirstName] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [birthDate, setBirthDate] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<Role>('CHILD')

  const createKid = useCreateKidMember(familyId ?? '')

  const canCreate =
    !!familyId &&
    firstName.trim().length > 0 &&
    gender !== null &&
    birthDate.trim().length > 0

  function onCreate() {
    if (!familyId || !gender) return
    createKid.mutate(
      {
        firstName: firstName.trim(),
        lastName: familyName,
        gender,
        birthDate: birthDate.trim(),
        nickname: nickname.trim() || null,
        role,
      },
      {
        onSuccess: () => router.replace('/settings/family'),
      },
    )
  }

  return (
    <Screen>
      <Section>
        <Text style={styles.title}>Add kid (no phone)</Text>
        <Text style={styles.subtitle}>
          This creates a family member without an account. It's meant for kids who don't have a phone.
        </Text>

        <Text style={styles.label}>Kid’s first name</Text>
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />

        <Text style={styles.label}>Gender</Text>
        <ChipSelector
          options={GENDER_OPTIONS}
          value={gender}
          onChange={(v) => setGender((v as Gender) ?? null)}
          style={{ marginTop: 4 }}
        />

        <Text style={styles.label}>Birth date</Text>
        <DatePicker
          value={birthDate}
          onChange={setBirthDate}
          placeholder="YYYY-MM-DD"
          title="Pick birth date"
          enableYearPicker
          yearPickerRange={{ past: 18, future: 0 }}
        />

        <Text style={styles.label}>Nickname (optional)</Text>
        <TextInput value={nickname} onChangeText={setNickname} style={styles.input} />

        <Text style={styles.label}>Role</Text>
        <ChipSelector
          options={KID_ROLE_OPTIONS}
          value={role}
          onChange={(v) => setRole((v as Role) ?? 'CHILD')}
          style={{ marginTop: 4 }}
        />

        {/* Step 4+: avatar selection for member avatar */}

        <Button
          title="Create"
          size="lg"
          fullWidth
          onPress={onCreate}
          disabled={!canCreate || createKid.isPending}
          bold
        />
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 8 },
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
})
