import React, { useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import PhoneInput from 'react-native-phone-number-input'

import { toE164 } from '@/lib/auth/phone'

export type AuthMode = 'phone' | 'email'

type Props = {
  loading: boolean
  defaultCountry?: string // 'IL'
  onContinue: (identifier: string, mode: AuthMode) => Promise<void> | void
}

export function IdentifierStep({
  loading,
  defaultCountry = 'IL',
  onContinue,
}: Props) {
  const phoneRef = useRef<PhoneInput>(null)

  const [mode, setMode] = useState<AuthMode>('phone')
  const [email, setEmail] = useState('')
  const [phoneRaw, setPhoneRaw] = useState('')
  const [phoneE164, setPhoneE164] = useState('')

  const canContinue = useMemo(() => {
    if (mode === 'email') return email.trim().includes('@')
    return !!phoneE164 && /^\+\d{8,15}$/.test(phoneE164)
  }, [mode, email, phoneE164])

  async function handleContinue() {
    try {
      const identifier =
        mode === 'email'
          ? email.trim()
          : toE164(phoneE164 || phoneRaw, defaultCountry)

      if (mode === 'phone') {
        const isValid = phoneRef.current?.isValidNumber(phoneRaw) ?? true
        if (!isValid) {
          Alert.alert('Invalid phone number', 'Please check the number and try again.')
          return
        }
      }

      await onContinue(identifier, mode)
    } catch (err: any) {
      Alert.alert('Invalid input', err?.message ?? 'Please try again.')
    }
  }

  return (
    <>
      {/* Mode toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'phone' && styles.toggleBtnActive]}
          onPress={() => setMode('phone')}
          disabled={loading}
        >
          <Text style={[styles.toggleText, mode === 'phone' && styles.toggleTextActive]}>
            Phone
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'email' && styles.toggleBtnActive]}
          onPress={() => setMode('email')}
          disabled={loading}
        >
          <Text style={[styles.toggleText, mode === 'email' && styles.toggleTextActive]}>
            Email
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'phone' ? (
        <View style={styles.field}>
          <Text style={styles.label}>Phone number</Text>

          <PhoneInput
            ref={phoneRef}
            defaultCode={defaultCountry as any}
            layout="first"
            value={phoneRaw}
            onChangeText={setPhoneRaw}
            onChangeFormattedText={(text) => {
              try {
                setPhoneE164(toE164(text, defaultCountry))
              } catch {
                setPhoneE164('')
              }
            }}
            // flag not showing? see section 2 below + these props:
            withDarkTheme={false}
            withShadow={false}
            // styling
            containerStyle={styles.phoneContainer}
            textContainerStyle={styles.phoneTextContainer}
            textInputStyle={styles.phoneTextInput}
          />

          {!!phoneE164 && (
            <Text style={styles.helperText}>We’ll send a code to {phoneE164}</Text>
          )}
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            returnKeyType="done"
          />
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          styles.primaryButton,
          (!canContinue || loading) && styles.buttonDisabled,
        ]}
        disabled={loading || !canContinue}
        onPress={handleContinue}
      >
        {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  toggleBtnActive: { backgroundColor: '#2563eb' },
  toggleText: { fontWeight: '700', color: '#2563eb' },
  toggleTextActive: { color: '#fff' },

  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },

  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },

  phoneContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  phoneTextContainer: { backgroundColor: '#F8FAFC' },
  phoneTextInput: { fontSize: 16, color: '#111827' },

  helperText: { fontSize: 12, color: '#6b7280', marginTop: 6 },

  button: { borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: '#2563eb' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontWeight: '600', color: '#fff' },
})
