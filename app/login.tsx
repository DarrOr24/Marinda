import { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'

import { AuthMode, IdentifierStep } from '@/components/auth/identifier-step'
import { OtpStep } from '@/components/auth/otp-step'
import { useAuthContext } from '@/hooks/use-auth-context'

type Stage = 'IDENTIFIER' | 'OTP'

export default function LoginScreen() {
  const { startAuth, confirmOtp, pendingIdentifier } = useAuthContext()

  const [stage, setStage] = useState<Stage>('IDENTIFIER')
  const [loading, setLoading] = useState(false)
  const [lastIdentifier, setLastIdentifier] = useState<string>('')

  async function onContinue(identifier: string, _mode: AuthMode) {
    try {
      setLoading(true)
      setLastIdentifier(identifier)

      const res = await startAuth(identifier)
      if (!res.ok) {
        Alert.alert('Login failed', res.error ?? 'Please try again.')
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
      if (!res.ok) {
        return { ok: false, error: res.error ?? 'Invalid or expired code.' }
      }
      return { ok: true }
    } finally {
      setLoading(false)
    }
  }

  async function onResendOtp() {
    if (!lastIdentifier) return { ok: false, error: 'Missing phone/email' }
    const res = await startAuth(lastIdentifier)
    return res.ok ? { ok: true } : { ok: false, error: res.error }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Marinda 💫</Text>
      <Text style={styles.subtitle}>
        Sign in or create an account with your phone number. Email login is supported for existing accounts.
      </Text>

      {stage === 'IDENTIFIER' ? (
        <IdentifierStep loading={loading} defaultCountry="IL" onContinue={onContinue} />
      ) : (
        <OtpStep
          loading={loading}
          destinationLabel={pendingIdentifier?.value ?? lastIdentifier}
          onSubmit={onSubmitOtp}
          onResend={onResendOtp}
          onBack={() => setStage('IDENTIFIER')}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80, backgroundColor: '#fff', gap: 16 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 24 },
})
