import { useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { showInvokeErrorAlert } from '@/lib/errors'
import { getSupabase } from '@/lib/supabase'

type Props = {
  secret: string
}

export function DevLogin({ secret }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function onLogin() {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      Alert.alert('Dev login', 'Enter the user’s email address.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await getSupabase().functions.invoke('dev_login', {
        body: {
          secret,
          email: normalizedEmail,
        },
      })
      if (error) {
        showInvokeErrorAlert('Dev login failed', error, data, 'Could not sign in.')
        return
      }
      if (!data?.ok || !data?.access_token || !data?.refresh_token) {
        Alert.alert('Dev login', data?.error ?? 'Could not sign in.')
        return
      }
      await getSupabase().auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Dev: log in without OTP</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="user@example.com"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={onLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Getting link...' : 'Get magic link'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  button: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})
