// app/settings/add-member/index.tsx
import { useRouter } from 'expo-router'
import { StyleSheet, Text } from 'react-native'

import { Button, Screen, Section } from '@/components/ui'


export default function AddMemberChooserScreen() {
  const router = useRouter()

  return (
    <Screen>
      <Section>
        <Text style={styles.title}>Add a family member</Text>
        <Text style={styles.subtitle}>
          Choose how you want to add someone to your family.
        </Text>

        <Button
          title="Invite a new member by SMS"
          size="lg"
          fullWidth
          onPress={() => router.push('/settings/add-member/sms-invite')}
        />

        <Button
          title="Add a kid without a phone"
          size="lg"
          type="secondary"
          fullWidth
          onPress={() => router.push('/settings/add-member/add-kid')}
        />

        <Button
          title="Cancel"
          size="lg"
          type="ghost"
          fullWidth
          onPress={() => router.back()}
        />
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 8 },
})
