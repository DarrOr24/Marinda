import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'

import type { AvatarSize } from '@/components/avatar/avatar'
import { Avatar } from '@/components/avatar/avatar'
import { useProfile, useUpdateProfile } from '@/lib/profiles/profiles.hooks'
import { getSupabase } from '@/lib/supabase'

type ProfileAvatarProps = {
  profileId: string
  isUpdatable?: boolean
  size?: AvatarSize
}

export function ProfileAvatar({
  profileId,
  isUpdatable = false,
  size = 'md',
}: ProfileAvatarProps) {
  const { data: profile } = useProfile(profileId)
  const updateProfile = useUpdateProfile()
  const supabase = getSupabase()

  const [uri, setUri] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.avatar_url) {
      setUri(null)
      return
    }

    const { data: pub } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(profile.avatar_url)

    setUri(pub.publicUrl ?? null)
  }, [profile?.avatar_url, supabase])

  const handlePress = async () => {
    if (!isUpdatable) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    })

    if (result.canceled) return

    const localUri = result.assets[0].uri
    const previousUri = uri

    // optimistic preview
    setUri(localUri)

    try {
      await updateProfile.mutateAsync({
        profileId,
        avatarFileUri: localUri,
        updates: {}, // only avatar
      })

    } catch (_err) {
      setUri(previousUri ?? null)
    }
  }

  return (
    <Avatar
      type="profile"
      uri={uri ?? undefined}
      size={size}
      onPress={isUpdatable ? handlePress : undefined}
    />
  )
}
