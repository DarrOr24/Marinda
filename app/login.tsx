import { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { useAuthContext } from '@/hooks/use-auth-context'


export default function LoginScreen() {
  const { signInWithEmailPassword } = useAuthContext()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailLogin() {
    if (!signInWithEmailPassword) return

    try {
      setLoading(true)
      await signInWithEmailPassword(email.trim(), password)
    } catch (err: any) {
      console.error('Login failed:', err)
      Alert.alert('Login failed', err?.message ?? 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Marinda 💫</Text>
      <Text style={styles.subtitle}>
        Sign in or create your family account to continue
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.loginButton]}
        disabled={loading}
        onPress={handleEmailLogin}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={() => {
          Alert.alert('Not yet', 'Google sign-in is coming soon.')
        }}
      >
        <Text style={[styles.buttonText, styles.googleButtonText]}>
          Continue with Google
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.createButton]}
        onPress={() => Alert.alert('TODO', 'Create Family Account flow')}
      >
        <Text style={styles.createText}>Create Family Account</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    backgroundColor: '#fff',
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
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
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#2563eb',
  },
  googleButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  buttonText: {
    fontWeight: '600',
    color: '#fff',
  },
  googleButtonText: {
    color: '#2563eb',
  },
  createButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  createText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
})
