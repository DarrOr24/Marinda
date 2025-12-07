// app/settings/account.tsx
import { ProfileAvatar } from '@/components/avatar/profile-avatar'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useProfile, useUpdateProfile } from '@/lib/profiles/profiles.hooks'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

export default function AccountSettingsScreen() {
  const { member } = useAuthContext() as any
  const profileId = member?.profile_id

  const { data, isLoading } = useProfile(profileId)
  const updateProfile = useUpdateProfile()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')

  // Load data when profile arrives
  useEffect(() => {
    if (!data) return

    setFirstName(data.first_name ?? '')
    setLastName(data.last_name ?? '')
    setGender(data.gender ?? '')
    setBirthDate(data.birth_date ?? '')
  }, [data])

  const hasChanges =
    firstName !== (data?.first_name ?? '') ||
    lastName !== (data?.last_name ?? '') ||
    gender !== (data?.gender ?? '') ||
    birthDate !== (data?.birth_date ?? '')

  const handleSave = async () => {
    if (!profileId) return

    await updateProfile.mutateAsync({
      profileId,
      updates: {
        first_name: firstName,
        last_name: lastName,
        gender,
        birth_date: birthDate,
      },
    })
  }

  if (isLoading || !data) {
    return (
      <View style={[styles.centerOnly, { marginTop: 32 }]}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>Loading profile…</Text>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account Settings</Text>

      {/* Avatar */}
      <Text style={styles.label}>Profile Photo</Text>
      <View style={styles.avatarWrapper}>
        {profileId ? (
          <ProfileAvatar
            profileId={profileId}
            size="xl"
            isUpdatable={true}
          />
        ) : null}
      </View>

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
      <TextInput
        value={gender}
        onChangeText={setGender}
        style={styles.input}
        placeholder="MALE / FEMALE"
      />

      {/* Birth date */}
      <Text style={styles.label}>Birth Date</Text>
      <TextInput
        value={birthDate}
        onChangeText={setBirthDate}
        style={styles.input}
        placeholder="YYYY-MM-DD"
      />

      {/* Save */}
      <Pressable
        onPress={handleSave}
        disabled={updateProfile.isPending || !hasChanges}
        style={[
          styles.saveBtn,
          (updateProfile.isPending || !hasChanges) && styles.saveBtnDisabled,
        ]}
      >
        <Text style={styles.saveBtnText}>
          {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
        </Text>
      </Pressable>
    </View>
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
  avatarWrapper: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  saveBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
})
