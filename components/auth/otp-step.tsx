import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'


type Props = {
  loading: boolean
  destinationLabel: string
  length?: number
  onSubmit: (code: string) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string }
  onResend: () => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string }
  onBack: () => void
}

const RESEND_SECONDS = 60

export function OtpStep({
  loading,
  destinationLabel,
  length = 6,
  onSubmit,
  onResend,
  onBack,
}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const [errorText, setErrorText] = useState<string | null>(null)
  const [submittedForCode, setSubmittedForCode] = useState<string | null>(null)

  const [secondsLeft, setSecondsLeft] = useState<number>(RESEND_SECONDS)
  const [isResending, setIsResending] = useState(false)

  const inputsRef = useRef<Array<TextInput | null>>([])

  const code = useMemo(() => digits.join(''), [digits])
  const isComplete = useMemo(() => digits.every((d) => d.length === 1), [digits])

  // autofocus
  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [secondsLeft])

  useEffect(() => {
    if (submittedForCode && code !== submittedForCode) {
      setSubmittedForCode(null)
    }
    if (errorText && code.length > 0) {
      setErrorText(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  async function runSubmit(submitCode: string) {
    if (!submitCode || submitCode.length !== length) return
    if (loading) return
    if (submittedForCode === submitCode) return

    setSubmittedForCode(submitCode)
    const res = await onSubmit(submitCode)

    if (!res.ok) {
      setErrorText(res.error ?? 'Invalid or expired code. Please try again.')
      setDigits(Array(length).fill(''))
      requestAnimationFrame(() => inputsRef.current[0]?.focus())
      setSubmittedForCode(null)
    }
  }

  useEffect(() => {
    if (isComplete) runSubmit(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete])

  function setDigitAt(index: number, value: string) {
    const v = value.replace(/\D/g, '')
    setDigits((prev) => {
      const next = [...prev]
      next[index] = v.slice(-1)
      return next
    })
  }

  function focusIndex(i: number) {
    inputsRef.current[i]?.focus()
  }

  const resendDisabled = loading || isResending || secondsLeft > 0

  async function handleResend() {
    if (resendDisabled) return
    try {
      setIsResending(true)
      setErrorText(null)
      const res = await onResend()
      if (!res.ok) {
        setErrorText(res.error ?? 'Could not resend code. Please try again.')
        return
      }

      setSecondsLeft(RESEND_SECONDS)

      setDigits(Array(length).fill(''))
      requestAnimationFrame(() => inputsRef.current[0]?.focus())
    } finally {
      setIsResending(false)
    }
  }

  return (
    <>
      <Text style={styles.instructions}>
        We sent a code to <Text style={styles.bold}>{destinationLabel}</Text>
      </Text>

      <View style={styles.otpRow}>
        {digits.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={(r) => { inputsRef.current[idx] = r }}
            value={digit}
            onChangeText={(text) => {
              const onlyDigit = text.replace(/\D/g, '')
              if (!onlyDigit) {
                setDigitAt(idx, '')
                return
              }
              setDigitAt(idx, onlyDigit)
              if (idx < length - 1) focusIndex(idx + 1)
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace') {
                if (digits[idx]) {
                  setDigitAt(idx, '')
                } else if (idx > 0) {
                  focusIndex(idx - 1)
                  setDigitAt(idx - 1, '')
                }
              }
            }}
            keyboardType="number-pad"
            maxLength={1}
            style={[styles.otpBox, errorText ? styles.otpBoxError : null]}
            textAlign="center"
            autoCorrect={false}
            autoCapitalize="none"
          />
        ))}
      </View>

      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : (
        <Text style={styles.helper}>Enter the {length}-digit code</Text>
      )}

      <TouchableOpacity
        style={[styles.linkBtn, resendDisabled && styles.linkBtnDisabled]}
        disabled={resendDisabled}
        onPress={handleResend}
      >
        <Text style={[styles.linkText, resendDisabled && styles.linkTextDisabled]}>
          {isResending
            ? 'Resending…'
            : secondsLeft > 0
              ? `Resend code in ${secondsLeft}s`
              : 'Resend code'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.primaryButton,
          (!isComplete || loading) && styles.buttonDisabled,
        ]}
        disabled={!isComplete || loading}
        onPress={() => runSubmit(code)}
      >
        {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Verify & Continue</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        disabled={loading}
        onPress={onBack}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Change phone / email
        </Text>
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  instructions: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 12 },
  bold: { fontWeight: '700', color: '#111827' },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8, marginBottom: 10 },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  otpBoxError: { borderColor: '#ef4444' },

  helper: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
  errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center', marginBottom: 8 },

  linkBtn: { alignItems: 'center', marginTop: 2, marginBottom: 4 },
  linkBtnDisabled: { opacity: 0.7 },
  linkText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  linkTextDisabled: { color: '#94a3b8' },

  button: { borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  primaryButton: { backgroundColor: '#2563eb' },
  secondaryButton: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#2563eb' },
  secondaryButtonText: { color: '#2563eb' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontWeight: '600', color: '#fff' },
})
