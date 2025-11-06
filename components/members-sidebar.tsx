// components/members-sidebar.tsx
import Sidebar from '@/components/Sidebar'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export default function MembersSidebar() {
  const { activeFamilyId } = useAuthContext()
  const { members } = useFamily(activeFamilyId || undefined)

  useSubscribeTableByFamily('family_members', activeFamilyId || undefined, ['family-members', activeFamilyId])

  if (!activeFamilyId) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.muted}>No family selected yet</Text>
      </View>
    )
  }

  if (members.isLoading) {
    return (
      <View style={styles.wrapper}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading family…</Text>
      </View>
    )
  }

  if (members.isError) {
    console.error('Failed to load members', members.error)
    return (
      <View style={styles.wrapper}>
        <Text style={styles.error}>Failed to load members</Text>
      </View>
    )
  }

  const membersData = members.data ?? []
  if (!membersData.length) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.muted}>No members yet</Text>
      </View>
    )
  }

  return <Sidebar members={membersData} />
}

const styles = StyleSheet.create({
  wrapper: {
    width: 92,
    paddingHorizontal: 12,
    paddingTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  muted: { color: '#64748b', fontSize: 12, textAlign: 'center' },
  error: { color: '#dc2626', fontSize: 12, textAlign: 'center' },
})
