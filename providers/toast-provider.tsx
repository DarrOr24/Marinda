// providers/toast-provider.tsx
import React, { PropsWithChildren, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'

import { ToastContext, type ToastType } from '@/hooks/use-toast-context'

interface ToastState {
  id: number
  message: string
  type: ToastType
}

const DEFAULT_DURATION = 2200

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastState[]>([])
  const animsRef = useRef<Record<number, Animated.Value>>({})
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const idRef = useRef(0)

  const hide = (id: number) => {
    const opacity = animsRef.current[id]
    if (!opacity) return

    Animated.timing(opacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setToasts(prev => prev.filter(t => t.id !== id))

      // cleanup
      delete animsRef.current[id]
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]!)
        delete timersRef.current[id]
      }
    })
  }

  const showToast = (message: string, type: ToastType, durationMs?: number) => {
    const duration = durationMs ?? DEFAULT_DURATION
    const id = ++idRef.current

    const opacity = new Animated.Value(0)
    animsRef.current[id] = opacity

    const toast: ToastState = { id, message, type }

    // append so NEW toast appears at the bottom of the stack
    setToasts(prev => [...prev, toast])

    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      timersRef.current[id] = setTimeout(() => hide(id), duration)
    })
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Stack container */}
      {toasts.length > 0 && (
        <View style={styles.stackContainer}>
          {toasts.map(t => {
            const opacity = animsRef.current[t.id] ?? new Animated.Value(1)

            const backgroundColor =
              t.type === 'success'
                ? '#16a34a'
                : t.type === 'error'
                  ? '#dc2626'
                  : '#2563eb'

            return (
              <Animated.View
                key={t.id}
                style={[
                  styles.toast,
                  {
                    opacity,
                    backgroundColor,
                  },
                ]}
              >
                <Text style={styles.toastText}>{t.message}</Text>
              </Animated.View>
            )
          })}
        </View>
      )}
    </ToastContext.Provider>
  )
}

const styles = StyleSheet.create({
  stackContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    // children will stack upward as we add more
  },
  toast: {
    maxWidth: '90%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    marginTop: 8, // space between stacked toasts
  },
  toastText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
})
