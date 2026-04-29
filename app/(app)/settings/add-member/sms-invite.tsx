// app/settings/add-member/sms-invite.tsx
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import { useTranslation } from 'react-i18next'

import { ChipSelector } from '@/components/chip-selector'
import { Button, PhoneField, Screen, Section } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useRtlStyles } from '@/hooks/use-rtl-styles'
import { showInvokeErrorAlert } from '@/lib/errors'
import { ROLE_OPTIONS, type Role } from '@/lib/members/members.types'
import { getSupabase } from '@/lib/supabase'


export default function SmsInviteScreen() {
  const { t } = useTranslation()
  const r = useRtlStyles()
  const [phone, setPhone] = useState('') // E.164
  const [role, setRole] = useState<Role>('CHILD')
  const [isSending, setIsSending] = useState(false)

  const router = useRouter()
  const queryClient = useQueryClient()
  const { activeFamilyId } = useAuthContext() as any
  const supabase = getSupabase()

  const canSend = !!phone && !!role && !isSending
  const roleOptions = useMemo(
    () =>
      ROLE_OPTIONS.map((option) => ({
        ...option,
        label: t(option.labelKey),
      })),
    [t],
  )

  async function onSend() {
    if (!activeFamilyId) {
      Alert.alert(
        t('settings.smsInvite.noFamilyTitle'),
        t('settings.smsInvite.noFamilyMessage'),
      )
      return
    }

    if (!phone) {
      Alert.alert(t('settings.smsInvite.missingPhoneTitle'), t('settings.smsInvite.missingPhoneMessage'))
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
          t('settings.smsInvite.couldNotSendInvite'),
          error,
          data,
          t('settings.smsInvite.couldNotSendInvite'),
        )
        return
      }

      if (!data?.ok) {
        showInvokeErrorAlert(
          t('settings.smsInvite.couldNotSendInvite'),
          null,
          data,
          t('settings.smsInvite.couldNotSendInvite'),
        )
        return
      }

      await queryClient.invalidateQueries({
        queryKey: ['family-invites', activeFamilyId],
      })

      Alert.alert(
        t('settings.smsInvite.sentTitle'),
        t('settings.smsInvite.sentMessage'),
      )
      router.replace('/settings/family')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Screen>
      <Section>
        <Text style={[styles.title, r.textAlignStart, r.writingDirection]}>
          {t('settings.smsInvite.title')}
        </Text>
        <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
          {t('settings.smsInvite.subtitle')}
        </Text>

        <PhoneField
          label={t('settings.smsInvite.phoneNumber')}
          value={phone}
          onChange={setPhone}
          defaultCountry="IL"
        />

        <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>{t('settings.common.role')}</Text>
        <ChipSelector
          options={roleOptions}
          value={role}
          onChange={(v) => setRole((v as Role) ?? 'CHILD')}
          style={{ marginTop: 4 }}
        />

        <Button
          title={isSending ? t('settings.email.sending') : t('settings.smsInvite.sendInvite')}
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
