import React, { createContext, PropsWithChildren, useContext, useMemo } from 'react'

import { getTheme, type AppTheme } from '@/config/theme'
import { useAuthContext } from '@/hooks/use-auth-context'

const ThemeContext = createContext<AppTheme | null>(null)

export function AppThemeProvider({ children }: PropsWithChildren) {
  const { effectiveMember } = useAuthContext()
  const memberAccentHex = effectiveMember?.color?.hex ?? null

  const theme = useMemo(() => getTheme(memberAccentHex), [memberAccentHex])

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const theme = useContext(ThemeContext)

  if (!theme) {
    throw new Error('useTheme must be used within AppThemeProvider')
  }

  return theme
}
