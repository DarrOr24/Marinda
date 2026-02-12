// components/avatar/family-avatar.tsx
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import { Image } from 'react-native'

import type { AvatarSize } from '@/components/avatar/avatar'
import { Avatar } from '@/components/avatar/avatar'
import { useFamily, useUpdateFamilyAvatar } from '@/lib/families/families.hooks'

type FamilyAvatarProps = {
  familyId: string
  isUpdatable?: boolean
  size?: AvatarSize
  isSelected?: boolean
  onSelect?: () => void
}

export function FamilyAvatar({
  familyId,
  isUpdatable = false,
  size = 'md',
  isSelected = false,
  onSelect,
}: FamilyAvatarProps) {
  const { family } = useFamily(familyId)
  const familyData = family.data

  const [loadedUri, setLoadedUri] = useState<string | null>(null)
  const updateFamilyAvatar = useUpdateFamilyAvatar(familyId)

  useEffect(() => {
    if (!familyData?.public_avatar_url) {
      setLoadedUri(null)
      return
    }

    const url = familyData.public_avatar_url as string

    Image.prefetch(url)
      .then(() => setLoadedUri(url))
      .catch(() => setLoadedUri(url))
  }, [familyData?.public_avatar_url])

  const handlePress = async () => {
    // selection logic has priority over editing
    if (onSelect) {
      onSelect()
      return
    }

    if (!isUpdatable) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    })

    if (result.canceled) return

    const localUri = result.assets[0].uri
    const previousUri = loadedUri

    setLoadedUri(localUri)

    updateFamilyAvatar.mutate(localUri, {
      onError: () => {
        setLoadedUri(previousUri ?? null)
      },
    })
  }

  return (
    <Avatar
      type="family"
      uri={loadedUri ?? undefined}
      size={size}
      onPress={isUpdatable || onSelect ? handlePress : undefined}
      isSelected={isSelected}
    />
  )
}
