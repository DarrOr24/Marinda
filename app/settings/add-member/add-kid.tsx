// app/settings/add-member/add-kid.tsx
import { useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput } from 'react-native'

import { ChipSelector } from '@/components/chip-selector'
import { DatePicker } from '@/components/date-picker'
import { Button, Screen, Section } from '@/components/ui'
import { ROLE_OPTIONS, type Role } from '@/lib/members/members.types'
import { GENDER_OPTIONS } from '@/lib/profiles/profiles.types'


export default function AddKidWithoutPhoneScreen() {
  const [firstName, setFirstName] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<Role>('CHILD')

  const showRoleWarning = useMemo(() => role !== 'CHILD', [role])

  const canCreate =
    firstName.trim().length > 0 &&
    gender !== null &&
    birthDate.trim().length > 0

  function onCreate() {
    // Step 4+: call RPC create kid profile + family_member + optional avatar upload
    Alert.alert('Not implemented yet', 'We’ll wire this in Step 4.')
  }

  return (
    <Screen>
      <Section>
        <Text style={styles.title}>Add kid (no phone)</Text>
        <Text style={styles.subtitle}>
          This creates a family member without an account.
        </Text>

        <Text style={styles.label}>Kid’s first name</Text>
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />

        <Text style={styles.label}>Gender</Text>
        <ChipSelector
          options={GENDER_OPTIONS}
          value={gender}
          onChange={setGender}
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
          options={ROLE_OPTIONS}
          value={role}
          onChange={(v) => setRole((v as Role) ?? 'CHILD')}
          style={{ marginTop: 4 }}
        />

        {showRoleWarning ? (
          <Text style={styles.warning}>
            Note: if this family member has a phone, it’s better to invite them by SMS instead.
          </Text>
        ) : null}

        {/* Step 4+: avatar selection for member avatar */}

        <Button
          title="Create"
          size="lg"
          fullWidth
          onPress={onCreate}
          disabled={!canCreate}
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
  warning: {
    fontSize: 12,
    color: '#92400e',
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
  },
})
