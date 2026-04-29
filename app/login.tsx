// app/login.tsx
import { useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { IdentifierStep } from '@/components/auth/identifier-step'
import { OtpStep } from '@/components/auth/otp-step'
import { DevLogin } from '@/components/login/dev-login'
import { LoginHeader } from '@/components/login/login-header'
import { ReviewerLogin } from '@/components/login/reviewer-login'
import { Screen } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import type { IdentifierInfo } from '@/lib/auth/auth.service'

type Stage = 'IDENTIFIER' | 'OTP'
type Mode = 'phone' | 'email'

export default function LoginScreen() {
  const { startAuth, confirmOtp, pendingIdentifier, pendingInviteToken } = useAuthContext()

  const [stage, setStage] = useState<Stage>('IDENTIFIER')
  const [mode, setMode] = useState<Mode>('phone')
  const [loading, setLoading] = useState(false)

  const [lastIdentifier, setLastIdentifier] = useState<IdentifierInfo | null>(null)

  const devLoginSecret = process.env.EXPO_PUBLIC_DEV_LOGIN_SECRET ?? ''
  const showDevLogin = __DEV__ && !!devLoginSecret
  const showReviewerLogin = process.env.EXPO_PUBLIC_REVIEWER_LOGIN_ENABLED === 'true'

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

  const helper =
    mode === 'phone'
      ? 'Having trouble connecting with your phone number? Sign in with email instead.'
      : 'Back to phone sign in'

  return (
    <Screen
      centerContent
      fixedHeader={<LoginHeader />}
      fixedHeaderStyle={styles.headerSlot}
      gap="lg"
      withBackground={false}
      keyboardShouldPersistTaps="handled"
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      contentStyle={styles.screenContent}
    >
      <View style={styles.hero}>
        {!!pendingInviteToken && (
          <Text style={styles.inviteNote}>
            You have a family invite waiting. Finish signing in to accept it.
          </Text>
        )}
      </View>

      <View style={styles.formContent}>
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

            {showReviewerLogin && (
              <ReviewerLogin disabled={loading} />
            )}

            {showDevLogin && (
              <DevLogin secret={devLoginSecret} />
            )}
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
    </Screen>
  )
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 24,
    paddingTop: 0,
  },

  headerSlot: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },

  hero: {
    alignItems: 'center',
    gap: 8,
  },

  formContent: {
    width: '100%',
    gap: 36,
  },

  linkWrap: {
    paddingVertical: 10,
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

  inviteNote: {
    fontSize: 12,
    color: '#16a34a',
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: 4,
  },
})
