// app/settings/add-member/sms-invite.tsx
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'

import { ChipSelector } from '@/components/chip-selector'
import { Button, PhoneField, Screen, Section } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { showInvokeErrorAlert } from '@/lib/errors'
import { ROLE_OPTIONS, type Role } from '@/lib/members/members.types'
import { getSupabase } from '@/lib/supabase'


export default function SmsInviteScreen() {
  const [phone, setPhone] = useState('') // E.164
  const [role, setRole] = useState<Role>('CHILD')
  const [isSending, setIsSending] = useState(false)

  const router = useRouter()
  const queryClient = useQueryClient()
  const { activeFamilyId } = useAuthContext() as any
  const supabase = getSupabase()

  const canSend = !!phone && !!role && !isSending

  async function onSend() {
    if (!activeFamilyId) {
      Alert.alert(
        'No family selected',
        'You need an active family to send an invite.',
      )
      return
    }

    if (!phone) {
      Alert.alert('Missing phone number', 'Please enter a phone number.')
      return
    }

    try {
      setIsSending(true)

      const { data, error } = await supabase.functions.invoke('create_invite', {
        body: {
          familyId: activeFamilyId,
          invited_phone: phone,
          role,
        },
      })

      if (error) {
        showInvokeErrorAlert(
          'Could not send invite',
          error,
          data,
          'Could not send invite',
        )
        return
      }

      if (!data?.ok) {
        showInvokeErrorAlert(
          'Could not send invite',
          null,
          data,
          'Could not send invite',
        )
        return
      }

      await queryClient.invalidateQueries({
        queryKey: ['family-invites', activeFamilyId],
      })

      Alert.alert(
        'Invite sent',
        'We sent an SMS invite to this phone number.',
      )
      router.replace('/settings/family')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Screen>
      <Section>
        <Text style={styles.title}>Invite by SMS</Text>
        <Text style={styles.subtitle}>
          Enter the phone number and select the role. The invitee’s role will be locked.
        </Text>

        <PhoneField
          label="Phone number"
          value={phone}
          onChange={setPhone}
          defaultCountry="IL"
        />

        <Text style={styles.label}>Role</Text>
        <ChipSelector
          options={ROLE_OPTIONS}
          value={role}
          onChange={(v) => setRole((v as Role) ?? 'CHILD')}
          style={{ marginTop: 4 }}
        />

        <Button
          title={isSending ? 'Sending…' : 'Send invite'}
          size="lg"
          fullWidth
          onPress={onSend}
          disabled={!canSend}
          bold
        />
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155' },
})
