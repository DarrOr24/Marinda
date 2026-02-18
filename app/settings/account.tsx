// app/settings/account.tsx
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { FamilyAvatar } from '@/components/avatar/family-avatar'
import { ChipSelector } from '@/components/chip-selector'
import { DatePicker } from '@/components/date-picker'
import { Button, Screen } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useHydratedEffect } from '@/hooks/use-hydrated-effect'
import { useMyFamilies } from '@/lib/families/families.hooks'
import { useProfile, useUpdateProfile } from '@/lib/profiles/profiles.hooks'


const GENDER_OPTIONS = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
]

export default function AccountSettingsScreen() {
  const { member } = useAuthContext()
  const profileId = member?.profile_id
  const activeFamilyId = member?.family_id ?? null

  const { data, isLoading } = useProfile(profileId ?? null)
  const updateProfile = useUpdateProfile()
  const {
    data: myFamilies,
    isLoading: isLoadingFamilies,
  } = useMyFamilies(profileId)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState<string>('')

  useHydratedEffect(() => {
    if (!data) return

    setFirstName(data.first_name ?? '')
    setLastName(data.last_name ?? '')
    setGender((data.gender as string) ?? null)
    setBirthDate(data.birth_date ?? '')
  }, [data])

  const hasChanges =
    firstName !== (data?.first_name ?? '') ||
    lastName !== (data?.last_name ?? '') ||
    (gender ?? '') !== (data?.gender ?? '') ||
    birthDate !== (data?.birth_date ?? '')

  const handleSave = async () => {
    if (!profileId) return

    await updateProfile.mutateAsync({
      profileId,
      updates: {
        first_name: firstName,
        last_name: lastName,
        gender: gender ?? undefined,
        birth_date: birthDate,
      },
    })
  }

  const families = useMemo(
    () => myFamilies ?? [],
    [myFamilies],
  )

  if (isLoading || !data) {
    return (
      <View style={[styles.centerOnly, { marginTop: 32 }]}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>Loading profile…</Text>
      </View>
    )
  }

  return (
    <Screen>
      <Text style={styles.sectionTitle}>Account Settings</Text>

      {/* My families */}
      <Text style={styles.label}>My families</Text>
      {isLoadingFamilies ? (
        <View style={styles.familiesLoadingRow}>
          <ActivityIndicator size="small" />
          <Text style={styles.subtitle}>Loading families…</Text>
        </View>
      ) : families.length === 0 ? (
        <Text style={styles.subtitle}>
          You are not a member of any families yet.
        </Text>
      ) : (
        <View style={styles.familiesRow}>
          {families.map((fam) => {
            const isSelected = families.length > 1 && fam.id === activeFamilyId
            return (
              <View key={fam.id} style={styles.familyItem}>
                <FamilyAvatar
                  familyId={fam.id}
                  size="md"
                  isSelected={isSelected}
                  // selection logic – can adjust later if needed
                  onSelect={() => {
                    // TODO: select family
                    console.log('TODO: select family', fam.id)
                  }}
                />
                <Text style={styles.familyName} numberOfLines={1}>
                  {fam.name}
                </Text>
                <Text style={styles.familyRole}>
                  {fam.role.toLowerCase()}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      {/* First name */}
      <Text style={styles.label}>First Name</Text>
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        style={styles.input}
      />

      {/* Last name */}
      <Text style={styles.label}>Last Name</Text>
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        style={styles.input}
      />

      {/* Gender */}
      <Text style={styles.label}>Gender</Text>
      <ChipSelector
        options={GENDER_OPTIONS}
        value={gender}
        onChange={setGender}
        style={{ marginTop: 4 }}
      />

      {/* Birth date */}
      <Text style={styles.label}>Birth Date</Text>
      <DatePicker
        value={birthDate}
        onChange={setBirthDate}
        title="Pick your birth date"
        disabled={updateProfile.isPending}
        enableYearPicker
        yearPickerRange={{ past: 120, future: 0 }}
      />

      {/* Save */}
      <Button
        title={updateProfile.isPending ? 'Saving…' : 'Save Changes'}
        type="primary"
        size="lg"
        onPress={handleSave}
        disabled={updateProfile.isPending || !hasChanges}
        fullWidth
        style={{ marginTop: 12 }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  centerOnly: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
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
  familiesLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  familyItem: {
    width: 84,
    alignItems: 'center',
    gap: 4,
  },
  familyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  familyRole: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
})
