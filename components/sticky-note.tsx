// components/sticky-note.tsx
import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'

type Props = {
  children: React.ReactNode
  /** Background color of the sticky note */
  backgroundColor?: string
  /** Left border accent color */
  borderLeftColor?: string
  style?: ViewStyle
}

/**
 * Bulletin-board style card (soft color + left accent).
 */
export function StickyNote({
  children,
  backgroundColor = '#fef9c3',
  borderLeftColor = '#facc15',
  style,
}: Props) {
  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.card,
          { backgroundColor, borderLeftColor },
        ]}
      >
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'stretch',
    width: '100%',
  },
  card: {
    alignSelf: 'stretch',
    padding: 14,
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
})
