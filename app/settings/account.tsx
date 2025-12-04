// app/settings/account.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { useProfile, useUpdateProfile } from '@/lib/profiles/profiles.hooks'
import { getSupabase } from '@/lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
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

  // avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null) // server public URL
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null) // local preview

  const supabase = getSupabase()

  // Load data when profile arrives
  useEffect(() => {
    if (!data) return

    setFirstName(data.first_name ?? '')
    setLastName(data.last_name ?? '')
    setGender(data.gender ?? '')
    setBirthDate(data.birth_date ?? '')

    if (data.avatar_url) {
      const { data: pub } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(data.avatar_url)
      // cache-bust with timestamp so new avatars show immediately
      setAvatarUrl(`${pub.publicUrl}?t=${Date.now()}`)
    }
  }, [data])

  // Preview > server URL
  const effectiveAvatar = pendingAvatar ?? avatarUrl

  const hasChanges =
    pendingAvatar !== null ||
    firstName !== (data?.first_name ?? '') ||
    lastName !== (data?.last_name ?? '') ||
    gender !== (data?.gender ?? '') ||
    birthDate !== (data?.birth_date ?? '')

  // Pick avatar (preview only)
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    })

    if (result.canceled) return
    const uri = result.assets[0].uri
    setPendingAvatar(uri)
  }

  const handleSave = async () => {
    if (!profileId) return

    await updateProfile.mutateAsync({
      profileId,
      avatarFileUri: pendingAvatar, // upload only if user picked new one
      updates: {
        first_name: firstName,
        last_name: lastName,
        gender,
        birth_date: birthDate,
      },
    })

    // after saving, clear pending so Save button disables correctly
    setPendingAvatar(null)
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
      <Text style={styles.sectionTitle}>Account</Text>

      {/* Avatar */}
      <Text style={styles.label}>Profile Photo</Text>
      <Pressable onPress={pickAvatar} style={styles.avatarWrapper}>
        {effectiveAvatar ? (
          <Image source={{ uri: effectiveAvatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarEmpty}>
            <Text style={styles.avatarEmptyText}>Tap to upload</Text>
          </View>
        )}
      </Pressable>

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
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarEmpty: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmptyText: {
    color: '#334155',
    fontWeight: '600',
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
