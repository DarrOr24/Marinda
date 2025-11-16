// app/signup/credentials.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { useSignUpFlow } from '@/providers/signup-flow-provider'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function SignUpCredentialsScreen() {
  const router = useRouter()
  const { signUpWithEmailPassword } = useAuthContext()
  const { details, reset } = useSignUpFlow()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const emailOk = /\S+@\S+\.\S+/.test(email.trim())
  const passOk = password.length >= 6
  const matchOk = password === confirm
  const disabled = !emailOk || !passOk || !matchOk

  async function onSubmit() {
    if (!signUpWithEmailPassword) return
    try {
      setLoading(true)
      const session = await signUpWithEmailPassword(email.trim(), password, {
        first_name: details.first_name.trim(),
        last_name: details.last_name.trim(),
        gender: details.gender,
        birth_date: details.birth_date || '',
        avatar_url: details.avatar_url || '',
      })
      if (!session) {
        Alert.alert('Check your email', 'We sent you a verification link to complete sign up.')
        router.replace('/login')
      } else {
        reset()
      }
    } catch (err: any) {
      console.error('Sign up failed:', err)
      Alert.alert('Sign up failed', err?.message ?? 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your login</Text>
      <Text style={styles.subtitle}>We’ll link it to the profile you just entered.</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Minimum 6 characters"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          secureTextEntry
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Re-enter your password"
        />
      </View>

      <TouchableOpacity
        style={[styles.primary, disabled && { opacity: 0.6 }]}
        disabled={disabled || loading}
        onPress={onSubmit}
      >
        {loading ? <ActivityIndicator /> : <Text style={styles.primaryText}>Create Account</Text>}
      </TouchableOpacity>

      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Link href="/login"><Text style={{ color: '#2563eb', fontWeight: '600' }}>Back to login</Text></Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 12 },
  row: { gap: 6 },
  label: { fontWeight: '500', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  primary: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '700' },
})
