// components/ui/screen.tsx
import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import CheckerboardBackground from '../checkerboard-background'

type Props = { children: React.ReactNode }

export function Screen({ children }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + insets.bottom },
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
  content: { padding: 16, gap: 16 },
})
