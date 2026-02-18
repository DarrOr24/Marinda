import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'

import { Button, type ButtonSize } from '@/components/ui'

type Props = {
  direction: 'back' | 'forward'
  size?: ButtonSize
  path?: string
  color?: string
}

export function BackForwardButton({ direction, size = 'sm', path, color = '#000' }: Props) {

  if (direction === 'forward' && !path) {
    throw new Error('Path is required for forward direction')
  }

  const router = useRouter()

  const icon = direction === 'back' ? 'chevron-back' : 'chevron-forward'
  const iconSize = size === 'sm' ? 22 : size === 'md' ? 24 : size === 'lg' ? 26 : 28

  const onPress = () => {
    if (direction === 'back') {
      router.back()
    } else if (direction === 'forward') {
      router.push(path as any)
    }
  }

  return (
    <Button
      title=""
      type="ghost"
      size={size}
      round
      onPress={onPress}
      leftIcon={<Ionicons name={icon} size={iconSize} />}
      leftIconColor={color}
    />
  )
}
