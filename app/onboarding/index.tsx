// app/onboarding/index.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { Link, router } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function OnboardingHub() {
  const { signOut } = useAuthContext()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let’s get you started</Text>
      <Text style={styles.sub}>Create a new family or join an existing one.</Text>

      <View style={styles.action}>
        <Link href="/onboarding/create" asChild>
          <TouchableOpacity>
            <Text style={styles.actionText}>Create Family</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={[styles.action, styles.secondary]}>
        <Link href="/onboarding/join" asChild>
          <TouchableOpacity>
            <Text style={[styles.actionText, styles.secondaryText]}>Join with Code</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={[styles.action, styles.secondary]}>
        <TouchableOpacity onPress={() => { signOut(); router.replace('/login') }}>
          <Text style={[styles.actionText, styles.secondaryText]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  action: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  secondary: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563eb',
    borderStyle: 'solid',
  },
  secondaryText: {
    color: '#2563eb',
  },
})
