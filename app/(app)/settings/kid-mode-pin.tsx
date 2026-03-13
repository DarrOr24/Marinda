import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native'

import { Button, Screen } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useMember, useUpdateMember } from '@/lib/members/members.hooks'

const KID_MODE_PIN_PATTERN = /^\d{4}$/

export default function KidModePinSettingsScreen() {
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
      Alert.alert('Choose a 4-digit PIN', 'Please enter exactly 4 digits.')
      return
    }

    if (pin !== confirmPin) {
      Alert.alert('PINs do not match', 'Please enter the same PIN twice.')
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
          Alert.alert('PIN saved', 'Your kid mode PIN has been updated.')
        },
        onError: (error: any) => {
          Alert.alert('Save failed', error?.message ?? 'Please try again.')
        },
      },
    )
  }

  if (!hasParentPermissions) {
    return (
      <Screen>
        <Text style={styles.title}>Kid mode PIN</Text>
        <Text style={styles.subtitle}>
          Only parents can configure the PIN used for kid mode.
        </Text>
      </Screen>
    )
  }

  if (memberQuery.isLoading && !member) {
    return (
      <Screen>
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.subtitle}>Loading PIN settings…</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Text style={styles.title}>Kid mode PIN</Text>
      <Text style={styles.subtitle}>
        {hasExistingPin
          ? 'Change the 4-digit PIN required to switch back to parent mode.'
          : 'Set a 4-digit PIN before using kid mode.'}
      </Text>

      <View style={styles.card}>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Current status</Text>
          <Text style={styles.statusValue}>
            {hasExistingPin ? 'PIN configured' : 'No PIN configured'}
          </Text>
        </View>

        <Text style={styles.label}>{hasExistingPin ? 'New PIN' : 'PIN'}</Text>
        <TextInput
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder="1234"
          style={styles.input}
        />

        <Text style={styles.label}>Confirm PIN</Text>
        <TextInput
          value={confirmPin}
          onChangeText={setConfirmPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder="1234"
          style={styles.input}
        />

        <Button
          title={updateMember.isPending ? 'Saving…' : hasExistingPin ? 'Change PIN' : 'Set PIN'}
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
