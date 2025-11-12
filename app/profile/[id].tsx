// app/profile/[id].tsx
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import CheckerboardBackground from '@/components/checkerboard-background'
import MemberSidebar from '@/components/members-sidebar'
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

  const isKid = current?.role === 'TEEN' || current?.role === 'CHILD'
  const points = current?.points ?? 0


  return (
    <View style={styles.screen}>
      <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

      {/* Left sidebar */}
      <MemberSidebar />

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

        {isKid && (
          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>Points Earned</Text>
            <Text style={styles.pointsValue}>{points}</Text>
          </View>
        )}


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
  pointsCard: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
    minWidth: 150,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e3a8a',
    marginTop: 6,
  },
})
