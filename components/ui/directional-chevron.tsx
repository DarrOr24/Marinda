import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import type { StyleProp, TextStyle } from 'react-native'

import { useRtlStyles } from '@/hooks/use-rtl-styles'

type DirectionalChevronProps = {
  size?: number
  color?: string
  style?: StyleProp<TextStyle>
}

export function DirectionalChevron({
  size = 18,
  color = '#94a3b8',
  style,
}: DirectionalChevronProps) {
  const { rtl } = useRtlStyles()
  const name: ComponentProps<typeof MaterialCommunityIcons>['name'] =
    rtl ? 'chevron-left' : 'chevron-right'

  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      style={style}
    />
  )
}
