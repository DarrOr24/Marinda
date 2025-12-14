// components/avatar/profile-avatar.tsx
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import { Image } from 'react-native'

import type { AvatarSize } from '@/components/avatar/avatar'
import { Avatar } from '@/components/avatar/avatar'
import { useProfile, useUpdateProfile } from '@/lib/profiles/profiles.hooks'

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

  const [uri, setUri] = useState<string | null>(null)
  const [loadedUri, setLoadedUri] = useState<string | null>(null)

  // pull cache-buster value (we inject this in useUpdateProfile.onSuccess)
  const avatarCacheBuster = (profile as any)?.avatarCacheBuster

  // --- Load remote avatar + prevent flicker ---
  useEffect(() => {
    const baseUrl = profile?.public_avatar_url || null

    if (!baseUrl) {
      setUri(null)
      setLoadedUri(null)
      return
    }

    // same base URL for everyone + optional cache-buster
    const url =
      avatarCacheBuster != null
        ? `${baseUrl}?v=${avatarCacheBuster}`
        : baseUrl

    setUri(url)

    Image.prefetch(url)
      .then(() => {
        setLoadedUri(url)
      })
      .catch(() => {
        // even if prefetch fails, fall back to showing the URL
        setLoadedUri(url)
      })
  }, [profile?.public_avatar_url, avatarCacheBuster])

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

    // Optimistic preview on this component
    setLoadedUri(localUri)
    setUri(localUri)

    try {
      await updateProfile.mutateAsync({
        profileId,
        avatarFileUri: localUri,
        updates: {},
      })
      // after this, useUpdateProfile.onSuccess will bump avatarCacheBuster,
      // which triggers the effect above in *all* ProfileAvatar instances.
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
