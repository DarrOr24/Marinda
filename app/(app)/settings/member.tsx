import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'

import { Button, Screen, ScreenState } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useMember, useUpdateMember } from '@/lib/members/members.hooks'

export default function MyFamilyMemberSettingsScreen() {
  const { effectiveMember } = useAuthContext() as any
  const memberQuery = useMember(effectiveMember?.id ?? null)
  const updateMember = useUpdateMember()
  const member = memberQuery.data ?? effectiveMember

  const [nickname, setNickname] = useState('')
  const [themeColor, setThemeColor] = useState<string>('blue') // placeholder

  useEffect(() => {
    setNickname(member?.nickname ?? '')
  }, [member])

  const hasChanges = nickname.trim() !== (member?.nickname ?? '') // extend later

  const onSave = async () => {
    if (!member?.id) {
      Alert.alert('Not ready', 'Please try again in a moment.')
      return
    }

    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        updates: {
          nickname: nickname.trim() || null,
        },
      })
      Alert.alert('Saved', 'Member settings updated.')
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again.')
    }
  }

  if (!member && memberQuery.isLoading) {
    return (
      <ScreenState
        title="Member settings"
        description="Loading your family member settings."
        showActivityIndicator
      />
    )
  }

  return (
    <Screen>
      <Text style={styles.label}>Nickname (optional)</Text>
      <TextInput value={nickname} onChangeText={setNickname} style={styles.input} />

      <Text style={styles.label}>Theme color</Text>
      <View style={styles.placeholderBox}>
        <Text style={styles.subtitle}>
          Later: your color theme selector here (chips / palette / preview).
        </Text>
        <Text style={[styles.subtitle, { marginTop: 6 }]}>Current: {themeColor}</Text>
      </View>

      <Button
        title={updateMember.isPending ? 'Saving…' : 'Save Changes'}
        type="primary"
        size="lg"
        onPress={onSave}
        disabled={!hasChanges || updateMember.isPending}
        fullWidth
        style={{ marginTop: 12 }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: '#334155' },
  subtitle: { fontSize: 13, color: '#64748b' },
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
  placeholderBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
})
