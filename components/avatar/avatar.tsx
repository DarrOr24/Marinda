// components/avatar/avatar.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
import React from 'react'
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'
export type AvatarType = 'profile' | 'family'

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 120,
}

const SELECT_BORDER_MAP: Record<AvatarSize, number> = {
  sm: 2,
  md: 2,
  lg: 3,
  xl: 4,
}

interface AvatarProps {
  uri?: string | null
  label?: string
  type?: AvatarType
  size?: AvatarSize
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  isSelected?: boolean
}

export function Avatar({
  uri,
  label,
  type = 'profile',
  size = 'md',
  onPress,
  style,
  isSelected = false,
}: AvatarProps) {
  const dimension = SIZE_MAP[size]
  const radius = dimension / 2

  const wrapperDimension = isSelected ? dimension + 8 : dimension
  const wrapperRadius = wrapperDimension / 2
  const borderWidth = isSelected ? SELECT_BORDER_MAP[size] : 0

  const fallbackIconName =
    type === 'family'
      ? 'account-group'
      : 'account'

  const content = uri ? (
    <Image
      source={{ uri }}
      style={[
        styles.image,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius,
        },
      ]}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius,
        },
      ]}
    >
      {label ? (
        <Text style={styles.fallbackLabel}>{label}</Text>
      ) : (
        <MaterialCommunityIcons
          name={fallbackIconName}
          size={dimension * 0.6}
          color="#64748b"
        />
      )}
    </View>
  )

  const WrapperComponent = onPress ? Pressable : View

  return (
    <WrapperComponent
      //@ts-ignore Pressable vs View style prop type
      style={({ pressed }: any) => [
        styles.wrapper,
        {
          width: wrapperDimension,
          height: wrapperDimension,
          borderRadius: wrapperRadius,
          borderWidth,
          borderColor: isSelected ? '#2563eb' : 'transparent',
          opacity: onPress && pressed ? 0.8 : 1,
        },
        style,
      ]}
      {...(onPress ? { onPress } : {})}
    >
      {content}
    </WrapperComponent>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: '#e5e7eb',
  },
  fallback: {
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
})
