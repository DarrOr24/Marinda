// components/avatar/member-avatar.tsx
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import { Image } from 'react-native'

import type { AvatarSize } from '@/components/avatar/avatar'
import { Avatar } from '@/components/avatar/avatar'
import { useMember, useUpdateMember } from '@/lib/members/members.hooks'


type MemberAvatarProps = {
  memberId?: string
  isUpdatable?: boolean
  size?: AvatarSize
}

export function MemberAvatar({
  memberId,
  isUpdatable = false,
  size = 'md',
}: MemberAvatarProps) {
  const { data: member } = useMember(memberId ?? null)
  const updateMember = useUpdateMember()

  const [uri, setUri] = useState<string | null>(null)
  const [loadedUri, setLoadedUri] = useState<string | null>(null)

  const avatarCacheBuster = member?.avatarCacheBuster

  useEffect(() => {
    const baseUrl = member?.public_avatar_url || null
    if (!baseUrl) {
      setUri(null)
      setLoadedUri(null)
      return
    }

    const url = avatarCacheBuster != null
      ? `${baseUrl}?v=${avatarCacheBuster}`
      : baseUrl

    setUri(url)

    Image.prefetch(url)
      .then(() => setLoadedUri(url))
      .catch(() => setLoadedUri(url))
  }, [member?.public_avatar_url, avatarCacheBuster])

  const handlePress = async () => {
    if (!isUpdatable || !memberId) return

    const pickerMediaTypes =
      (ImagePicker as any).MediaType?.Images
        ? [(ImagePicker as any).MediaType.Images]
        : (ImagePicker as any).MediaTypeOptions.Images;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: pickerMediaTypes,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled) return

    const localUri = result.assets[0].uri
    const previousUri = uri

    setLoadedUri(localUri)
    setUri(localUri)

    try {
      await updateMember.mutateAsync({
        memberId,
        avatarFileUri: localUri,
        updates: {},
      })
    } catch (err) {
      console.error('[MemberAvatar] upload failed:', err)
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
