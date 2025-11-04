// app/providers.tsx
import NetInfo from '@react-native-community/netinfo'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query'
import { PropsWithChildren, useEffect } from 'react'
import { AppState, Platform, useColorScheme } from 'react-native'

import AuthProvider from '@/providers/auth-provider'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function useReactQuerySync() {
  // App focus -> react-query focus
  useEffect(() => {
    if (Platform.OS === 'web') return
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active')
    })
    return () => sub.remove()
  }, [])

  // Network -> react-query online state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(!!state.isConnected)
    })
    return () => unsubscribe()
  }, [])
}

export default function Providers({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme()
  useReactQuerySync()

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
