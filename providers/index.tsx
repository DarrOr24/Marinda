// app/providers.tsx
import { Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka'
import NetInfo from '@react-native-community/netinfo'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query'
import { Audio } from 'expo-av'
import { PropsWithChildren, useEffect } from 'react'
import { AppState, Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider } from '@/providers/auth-provider'
import { AppThemeProvider } from '@/providers/theme-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { I18nProvider } from './i18n-provider'


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

function useAudioModeForSilentIOS() {
  useEffect(() => {
    if (Platform.OS !== 'ios') return
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => { })
  }, [])
}

export default function Providers({ children }: PropsWithChildren) {
  useFonts({ Fredoka_700Bold })
  useReactQuerySync()
  useAudioModeForSilentIOS()

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppThemeProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AppThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </I18nProvider>
    </SafeAreaProvider>
  )
}
