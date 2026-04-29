import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { Button, Screen } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useRtlStyles } from '@/hooks/use-rtl-styles'
import { useMember, useUpdateMember } from '@/lib/members/members.hooks'

const KID_MODE_PIN_PATTERN = /^\d{4}$/

export default function KidModePinSettingsScreen() {
  const { t } = useTranslation()
  const r = useRtlStyles()
  const { authMember, hasParentPermissions } = useAuthContext()
  const memberQuery = useMember(authMember?.id ?? null)
  const updateMember = useUpdateMember()

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const member = memberQuery.data
  const hasExistingPin = !!member?.kid_mode_pin

  useEffect(() => {
    setPin('')
    setConfirmPin('')
  }, [member?.kid_mode_pin])

  const canSave = useMemo(() => {
    return KID_MODE_PIN_PATTERN.test(pin) && pin === confirmPin && !updateMember.isPending
  }, [confirmPin, pin, updateMember.isPending])

  const handleSave = () => {
    if (!authMember?.id) return

    if (!KID_MODE_PIN_PATTERN.test(pin)) {
      Alert.alert(t('settings.kidModePin.choosePinTitle'), t('settings.kidModePin.choosePinMessage'))
      return
    }

    if (pin !== confirmPin) {
      Alert.alert(t('settings.kidModePin.mismatchTitle'), t('settings.kidModePin.mismatchMessage'))
      return
    }

    updateMember.mutate(
      {
        memberId: authMember.id,
        updates: { kid_mode_pin: pin },
      },
      {
        onSuccess: () => {
          setPin('')
          setConfirmPin('')
          Alert.alert(t('settings.kidModePin.savedTitle'), t('settings.kidModePin.savedMessage'))
        },
        onError: (error: any) => {
          Alert.alert(t('settings.common.saveFailedTitle'), error?.message ?? t('settings.common.pleaseTryAgain'))
        },
      },
    )
  }

  if (!hasParentPermissions) {
    return (
      <Screen>
        <Text style={[styles.title, r.textAlignStart, r.writingDirection]}>{t('settings.kidModePin.title')}</Text>
        <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
          {t('settings.kidModePin.parentsOnly')}
        </Text>
      </Screen>
    )
  }

  if (memberQuery.isLoading && !member) {
    return (
      <Screen>
        <View style={[styles.loadingRow, r.row]}>
          <ActivityIndicator />
          <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
            {t('settings.kidModePin.loading')}
          </Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Text style={[styles.title, r.textAlignStart, r.writingDirection]}>{t('settings.kidModePin.title')}</Text>
      <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
        {hasExistingPin
          ? t('settings.kidModePin.changeDescription')
          : t('settings.kidModePin.setDescription')}
      </Text>

      <View style={styles.card}>
        <View style={styles.statusBox}>
          <Text style={[styles.statusLabel, r.textAlignStart, r.writingDirection]}>
            {t('settings.kidModePin.currentStatus')}
          </Text>
          <Text style={[styles.statusValue, r.textAlignStart, r.writingDirection]}>
            {hasExistingPin ? t('settings.kidModePin.configured') : t('settings.kidModePin.notConfigured')}
          </Text>
        </View>

        <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>
          {hasExistingPin ? t('settings.kidModePin.newPin') : t('settings.kidModePin.pin')}
        </Text>
        <TextInput
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder="1234"
          style={[styles.input, r.textAlignStart, r.writingDirection]}
        />

        <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>
          {t('settings.kidModePin.confirmPin')}
        </Text>
        <TextInput
          value={confirmPin}
          onChangeText={setConfirmPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder="1234"
          style={[styles.input, r.textAlignStart, r.writingDirection]}
        />

        <Button
          title={
            updateMember.isPending
              ? t('settings.common.saving')
              : hasExistingPin
                ? t('settings.kidModePin.changePin')
                : t('settings.kidModePin.setPin')
          }
          type="primary"
          size="lg"
          fullWidth
          disabled={!canSave}
          onPress={handleSave}
          style={{ marginTop: 8 }}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  card: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  statusBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 16,
    color: '#0f172a',
  },
})
