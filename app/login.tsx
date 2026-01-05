// app/login.tsx (or wherever your login screen lives)
import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { IdentifierStep } from '@/components/auth/identifier-step'
import { OtpStep } from '@/components/auth/otp-step'
import { useAuthContext } from '@/hooks/use-auth-context'
import type { IdentifierInfo } from '@/lib/auth/auth.service'

type Stage = 'IDENTIFIER' | 'OTP'
type Mode = 'phone' | 'email'

export default function LoginScreen() {
  const { startAuth, confirmOtp, pendingIdentifier } = useAuthContext()

  const [stage, setStage] = useState<Stage>('IDENTIFIER')
  const [mode, setMode] = useState<Mode>('phone')
  const [loading, setLoading] = useState(false)

  const [lastIdentifier, setLastIdentifier] = useState<IdentifierInfo | null>(null)

  async function onContinue(rawValue: string, stepMode: Mode) {
    try {
      setLoading(true)

      const identifier: IdentifierInfo =
        stepMode === 'phone'
          ? { type: 'phone', value: rawValue.trim() }
          : { type: 'email', value: rawValue.trim().toLowerCase() }

      setLastIdentifier(identifier)

      const res = await startAuth(identifier)

      if (!res.ok) {
        Alert.alert('Sign in failed', res.error ?? 'Please try again.')
        return
      }

      setStage('OTP')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmitOtp(code: string) {
    try {
      setLoading(true)
      const res = await confirmOtp(code)
      return res.ok
        ? { ok: true }
        : { ok: false, error: res.error ?? 'Invalid or expired code.' }
    } finally {
      setLoading(false)
    }
  }

  async function onResendOtp() {
    if (!lastIdentifier) return { ok: false, error: 'Missing identifier' }

    const res = await startAuth(lastIdentifier)
    return res.ok ? { ok: true } : { ok: false, error: res.error }
  }

  const subtitle =
    mode === 'phone'
      ? 'Sign in or create an account with your phone number.'
      : 'Email sign-in is for existing accounts only (recovery).'

  const helper =
    mode === 'phone'
      ? 'Having trouble connecting with your phone number? Sign in with email instead.'
      : 'Back to phone sign in'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Marinda 💫</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {stage === 'IDENTIFIER' ? (
        <>
          <IdentifierStep
            loading={loading}
            defaultCountry="IL"
            mode={mode}
            onContinue={(identifier) => onContinue(identifier, mode)}
          />

          <TouchableOpacity
            disabled={loading}
            onPress={() => setMode((m) => (m === 'phone' ? 'email' : 'phone'))}
            style={styles.linkWrap}
          >
            <Text style={[styles.link, loading && styles.linkDisabled]}>{helper}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <OtpStep
          loading={loading}
          destinationLabel={pendingIdentifier?.value ?? lastIdentifier?.value ?? ''}
          onSubmit={onSubmitOtp}
          onResend={onResendOtp}
          onBack={() => setStage('IDENTIFIER')}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 72,
    gap: 16,
  },

  header: {
    gap: 8,
    alignItems: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0f172a',
  },

  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  linkWrap: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },

  link: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'center',
  },

  linkDisabled: {
    opacity: 0.5,
  },

  note: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: -6,
  },
})
