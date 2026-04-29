// app/settings/add-member/index.tsx
import { useRouter } from 'expo-router'
import { StyleSheet, Text } from 'react-native'
import { useTranslation } from 'react-i18next'

import { Button, Screen, Section } from '@/components/ui'
import { useRtlStyles } from '@/hooks/use-rtl-styles'


export default function AddMemberChooserScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const r = useRtlStyles()

  return (
    <Screen>
      <Section>
        <Text style={[styles.title, r.textAlignStart, r.writingDirection]}>
          {t('settings.addMember.title')}
        </Text>
        <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
          {t('settings.addMember.subtitle')}
        </Text>

        <Button
          title={t('settings.addMember.inviteBySms')}
          size="lg"
          fullWidth
          onPress={() => router.push('/settings/add-member/sms-invite')}
        />

        <Button
          title={t('settings.addMember.addKidNoPhone')}
          size="lg"
          type="secondary"
          fullWidth
          onPress={() => router.push('/settings/add-member/add-kid')}
        />

        <Button
          title={t('common.cancel')}
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
