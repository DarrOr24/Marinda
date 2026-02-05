// components/ui/screen.tsx
import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import CheckerboardBackground from '../checkerboard-background'

type Props = {
  children: React.ReactNode
  gap?: 'no' | 'sm' | 'md' | 'lg'
  bottomOffset?: number
  withBackground?: boolean
}

export function Screen({
  children,
  gap = 'md',
  bottomOffset = 0,
  withBackground = true,
}: Props) {
  const insets = useSafeAreaInsets()

  const gapStyle = gap === 'no' ? 0 : gap === 'sm' ? 8 : gap === 'md' ? 16 : gap === 'lg' ? 24 : 16
  const paddingBottom = 24 + insets.bottom + bottomOffset
  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      {withBackground && (
        <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom },
          { gap: gapStyle },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E6F4FE' },
  scroll: { flex: 1 },
  content: { padding: 16 },
})
