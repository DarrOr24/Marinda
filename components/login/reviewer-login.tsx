import { useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { signInWithPassword } from '@/lib/auth/auth.service'

const REVIEWER_EMAIL = 'reviewer@marinda.app'

type Props = {
  disabled?: boolean
}

export function ReviewerLogin({ disabled = false }: Props) {
  const [email, setEmail] = useState(REVIEWER_EMAIL)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSignIn() {
    setLoading(true)
    try {
      const res = await signInWithPassword(email, password)
      if (!res.ok) {
        Alert.alert('Reviewer sign in failed', res.error ?? 'Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = disabled || loading

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Reviewer access</Text>
      <Text style={styles.label}>
        For app review only. Use the credentials provided in the review notes.
      </Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder={REVIEWER_EMAIL}
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        editable={!loading}
      />
      <TouchableOpacity
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        onPress={onSignIn}
        disabled={isDisabled}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing in...' : 'Sign in as reviewer'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  button: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
})
