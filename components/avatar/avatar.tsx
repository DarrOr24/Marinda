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

interface AvatarProps {
  uri?: string | null
  label?: string
  type?: AvatarType
  size?: AvatarSize
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function Avatar({
  uri,
  label,
  type = 'profile',
  size = 'md',
  onPress,
  style,
}: AvatarProps) {
  const dimension = SIZE_MAP[size]
  const radius = dimension / 2

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

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.wrapper,
          { opacity: pressed ? 0.8 : 1 },
          style,
        ]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    )
  }

  return <View style={[styles.wrapper, style]}>{content}</View>
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
