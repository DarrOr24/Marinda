// components/avatar/family-avatar.tsx
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'

import type { AvatarSize } from '@/components/avatar/avatar'
import { Avatar } from '@/components/avatar/avatar'
import { useFamily, useUpdateFamilyAvatar } from '@/lib/families/families.hooks'
import { getSupabase } from '@/lib/supabase'

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
  const supabase = getSupabase()

  const [uri, setUri] = useState<string | null>(null)
  const updateFamilyAvatar = useUpdateFamilyAvatar(familyId)

  useEffect(() => {
    if (!familyData?.avatar_url) {
      setUri(null)
      return
    }

    const { data: pub } = supabase.storage
      .from('family-avatars')
      .getPublicUrl(familyData.avatar_url)

    setUri(pub.publicUrl ?? null)
  }, [familyData?.avatar_url, supabase])

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
    const previousUri = uri

    setUri(localUri)

    updateFamilyAvatar.mutate(localUri, {
      onError: () => {
        setUri(previousUri ?? null)
      },
    })
  }

  return (
    <Avatar
      type="family"
      uri={uri ?? undefined}
      size={size}
      onPress={isUpdatable || onSelect ? handlePress : undefined}
      isSelected={isSelected}
    />
  )
}
