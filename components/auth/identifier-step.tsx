// components/auth/identifier-step.tsx
import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { PhoneField } from '@/components/ui'

export type AuthMode = 'phone' | 'email'

type Props = {
  loading: boolean
  mode: AuthMode
  defaultCountry?: string // 'IL'
  onContinue: (identifier: string, mode: AuthMode) => Promise<void> | void
}

export function IdentifierStep({
  loading,
  mode,
  defaultCountry = 'IL',
  onContinue,
}: Props) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('') // E.164

  const canContinue = useMemo(() => {
    if (mode === 'email') return /^\S+@\S+\.\S+$/.test(email.trim())
    return !!phone && /^\+\d{8,15}$/.test(phone)
  }, [mode, email, phone])

  async function handleContinue() {
    try {
      const identifier =
        mode === 'email'
          ? email.trim().toLowerCase()
          : phone

      await onContinue(identifier, mode)
    } catch (err: any) {
      Alert.alert('Invalid input', err?.message ?? 'Please try again.')
    }
  }

  return (
    <>
      {mode === 'phone' ? (
        <View style={styles.field}>
          <PhoneField
            label="Phone number"
            value={phone}
            onChange={setPhone}
            defaultCountry={defaultCountry}
          />

          {!!phone && (
            <Text style={styles.helperText}>We’ll send a code to {phone}</Text>
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
          <Text style={styles.helperText}>
            Email sign-in is for existing accounts (recovery) only.
          </Text>
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


  helperText: { fontSize: 12, color: '#6b7280', marginTop: 6 },

  button: { borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: '#2563eb' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontWeight: '600', color: '#fff' },
})
