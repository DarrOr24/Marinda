// app/profile/[id].tsx
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import CheckerboardBackground from '@/components/CheckerboardBackground'
import Sidebar from '@/components/Sidebar'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime'

export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { activeFamilyId } = useAuthContext()
  const { members, family } = useFamily(activeFamilyId || undefined)

  useSubscribeTableByFamily('family_members', activeFamilyId ?? undefined, [
    'family-members',
    activeFamilyId,
  ])

  if (!activeFamilyId) {
    return (
      <View style={[styles.screen, styles.centerOnly]}>
        <Text style={styles.subtitle}>No family selected yet</Text>
      </View>
    )
  }

  if (members.isLoading) {
    return (
      <View style={[styles.screen, styles.centerOnly]}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>Loading family…</Text>
      </View>
    )
  }

  if (members.isError) {
    return (
      <View style={[styles.screen, styles.centerOnly]}>
        <Text style={styles.subtitle}>Failed to load members</Text>
      </View>
    )
  }

  const memberList = members.data ?? []
  const current = memberList.find(m => m.id === id)

  return (
    <View style={styles.screen}>
      <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

      {/* Left sidebar */}
      <Sidebar members={memberList} />

      {/* Center content */}
      <View style={styles.center}>
        <Text style={styles.title}>
          {current
            ? `${current.nickname || current.profile?.first_name || 'Member'}'s Profile`
            : 'Profile'}
        </Text>
        <Text style={styles.subtitle}>
          {family.data?.name ? `Family: ${family.data.name}` : 'Activities feed'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardText}>
            Coming soon: chores, grocery, announcements & wish-list activity for this member.
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E6F4FE',
  },
  centerOnly: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  card: {
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardText: { color: '#334155' },
})
