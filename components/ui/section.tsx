// components/ui/section.tsx
import React from 'react'
import { StyleSheet, View } from 'react-native'


type Props = {
  children: React.ReactNode
  backgroundColor?: string
}

export function Section({ children, backgroundColor = '#fff' }: Props) {
  return <View style={[styles.container, { backgroundColor }]}>{children}</View>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
})