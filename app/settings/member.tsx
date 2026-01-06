import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Screen } from '@/components/ui/screen'
import { useAuthContext } from '@/hooks/use-auth-context'

// TODO: hook/API you’ll likely add:
// - updateMember (nickname, themeColor, etc)

export default function MyFamilyMemberSettingsScreen() {
  const { member } = useAuthContext() as any
  const profileId = member?.profile_id as string | undefined

  const [nickname, setNickname] = useState('')
  const [themeColor, setThemeColor] = useState<string>('blue') // placeholder

  useEffect(() => {
    // TODO: load from member row when you have it:
    // setNickname(member?.nickname ?? '')
    // setThemeColor(member?.theme_color ?? 'blue')
    setNickname(member?.nickname ?? '')
  }, [member])

  const hasChanges = nickname !== (member?.nickname ?? '') // extend later

  const onSave = async () => {
    try {
      // TODO: call updateMember mutation
      Alert.alert('Saved', 'Member settings updated.')
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again.')
    }
  }

  if (!member) {
    return (
      <Screen>
        <ActivityIndicator />
        <Text style={styles.subtitle}>Loading…</Text>
      </Screen>
    )
  }

  return (
    <Screen>
      <Text style={styles.label}>Nickname (optional)</Text>
      <TextInput value={nickname} onChangeText={setNickname} style={styles.input} placeholder="e.g. Omri 😄" />

      <Text style={styles.label}>Theme color</Text>
      <View style={styles.placeholderBox}>
        <Text style={styles.subtitle}>
          Later: your color theme selector here (chips / palette / preview).
        </Text>
        <Text style={[styles.subtitle, { marginTop: 6 }]}>Current: {themeColor}</Text>
      </View>

      <Button
        title="Save Changes"
        type="primary"
        size="lg"
        onPress={onSave}
        disabled={!hasChanges}
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
