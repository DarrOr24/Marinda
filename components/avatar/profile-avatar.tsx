// components/avatar/profile-avatar.tsx
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import { Image } from 'react-native'

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
  const [loadedUri, setLoadedUri] = useState<string | null>(null)

  // --- Load remote avatar + prevent flicker ---
  useEffect(() => {
    if (!profile?.avatar_url) {
      setUri(null)
      setLoadedUri(null)
      return
    }

    const { data: pub } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(profile.avatar_url)

    const url = pub.publicUrl ?? null
    setUri(url)

    if (url) {
      Image.prefetch(url).then(() => {
        setLoadedUri(url)
      })
    }
  }, [profile?.avatar_url, supabase])

  // --- User selects a new avatar ---
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

    // Optimistic preview
    setLoadedUri(localUri)
    setUri(localUri)

    try {
      await updateProfile.mutateAsync({
        profileId,
        avatarFileUri: localUri,
        updates: {},
      })
    } catch (_err) {
      // rollback
      setLoadedUri(previousUri)
      setUri(previousUri)
    }
  }

  return (
    <Avatar
      type="profile"
      uri={loadedUri ?? undefined}
      size={size}
      onPress={isUpdatable ? handlePress : undefined}
    />
  )
}
