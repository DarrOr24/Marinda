// app/onboarding/index.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'


export default function OnboardingHub() {
  const { signOut } = useAuthContext()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let’s get you started</Text>
      <Text style={styles.sub}>Create a new family or join an existing one.</Text>

      <Button
        title="Create Family"
        onPress={() => router.push('/onboarding/create')}
        fullWidth
        bold
      />

      <Button
        title="Join with Code"
        type="outline"
        onPress={() => router.push('/onboarding/join')}
        fullWidth
      />

      <View style={styles.actionsWrap}>
        <Button
          title="Back"
          type="ghost"
          onPress={() => router.replace('/onboarding/details')}
          fullWidth
          bold
        />
        <Button
          title="Sign out"
          type="ghost"
          onPress={() => {
            signOut()
            router.replace('/login')
          }}
          fullWidth
        />
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
    justifyContent: 'flex-start',
  },
  actionsWrap: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-around',
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
  }
})
