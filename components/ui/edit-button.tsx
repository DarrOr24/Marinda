// components/ui/edit-button.tsx
import React from 'react'

import { Button, ButtonSize } from '@/components/ui/button'
import { Colors } from '@/config/colors'
import { MaterialCommunityIcons } from '@expo/vector-icons'


type Props = {
  onPress?: () => void
  disabled?: boolean
  size?: ButtonSize
}

export function EditButton({
  onPress,
  disabled,
  size = 'md',
}: Props) {

  const iconSize = size === 'sm'
    ? 12 : size === 'lg'
      ? 20 : size === 'xl'
        ? 24 : 18

  return (
    <Button
      type="ghost"
      size={size}
      round
      onPress={onPress}
      disabled={disabled}
      leftIcon={<MaterialCommunityIcons name="pencil" size={iconSize} />}
      leftIconColor={Colors.common.gray700}
      style={{ backgroundColor: Colors.common.gray200 }}
    />
  )
}
