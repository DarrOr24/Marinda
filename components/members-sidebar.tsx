// components/member-sidebar.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { usePathname, useRouter } from 'expo-router'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import MemberAvatar from '@/components/member-avatar'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime'
import type { Member } from '@/lib/families/families.types'

const SIDEBAR_WIDTH = 92
const AVATAR_SIZE = 48
const AVATAR_BORDER = 3

export default function MemberSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { activeFamilyId } = useAuthContext()
  const { members } = useFamily(activeFamilyId || undefined)

  // Realtime updates for this family
  useSubscribeTableByFamily('family_members', activeFamilyId || undefined, ['family-members', activeFamilyId])

  // Empty state: no family selected
  if (!activeFamilyId) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.muted}>No family selected yet</Text>
      </View>
    )
  }

  // Loading state
  if (members.isLoading) {
    return (
      <View style={styles.wrapper}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading family…</Text>
      </View>
    )
  }

  // Error state
  if (members.isError) {
    console.error('Failed to load members', members.error)
    return (
      <View style={styles.wrapper}>
        <Text style={styles.error}>Failed to load members</Text>
      </View>
    )
  }

  const membersData: Member[] = members.data ?? []
  if (!membersData.length) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.muted}>No members yet</Text>
      </View>
    )
  }

  // Active route checks
  const isHomeActive = pathname === '/' || pathname === '/index'
  const activeMemberId = pathname.match(/^\/profile\/(.+)$/)?.[1]

  // Main sidebar UI (formerly Sidebar.tsx)
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Home */}
        <TouchableOpacity
          onPress={() => router.push('/')}
          style={styles.item}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <View style={[styles.avatarBox, isHomeActive && styles.avatarBoxActive]}>
            <MaterialCommunityIcons name="home-variant-outline" size={28} color="#334155" />
          </View>
          <Text numberOfLines={1} style={styles.name}>Home</Text>
        </TouchableOpacity>

        {/* Members */}
        {membersData.map((m, idx) => {
          const isActive = activeMemberId === m.id
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => router.push({ pathname: '/profile/[id]', params: { id: m.id } })}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={`Open ${m.profile?.first_name ?? ''} ${m.profile?.last_name ?? ''}'s profile`}
            >
              <View style={[styles.avatarBox, isActive && styles.avatarBoxActive]}>
                <View style={styles.memberAvatarInner}>
                  <MemberAvatar member={m} index={idx} />
                </View>
              </View>
              <Text numberOfLines={1} style={styles.name}>
                {m.profile?.first_name ?? ''} {m.profile?.last_name ?? ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  // Loading/empty/error wrapper (kept narrow so layout doesn’t jump)
  wrapper: {
    width: SIDEBAR_WIDTH,
    paddingHorizontal: 12,
    paddingTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  muted: { color: '#64748b', fontSize: 12, textAlign: 'center' },
  error: { color: '#dc2626', fontSize: 12, textAlign: 'center' },

  // Main sidebar container
  container: {
    width: SIDEBAR_WIDTH,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRightWidth: 1,
    borderRightColor: '#d9e1f2',
  },
  list: {
    gap: 14,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  item: {
    width: SIDEBAR_WIDTH,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 16,
  },
  avatarBox: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: AVATAR_BORDER,   // fixed border width to keep size constant
    borderColor: 'transparent',   // becomes blue when active
  },
  avatarBoxActive: {
    borderColor: '#2563eb',
  },
  memberAvatarInner: {
    width: AVATAR_SIZE - AVATAR_BORDER * 2 - 4,
    height: AVATAR_SIZE - AVATAR_BORDER * 2 - 4,
    borderRadius: (AVATAR_SIZE - AVATAR_BORDER * 2 - 4) / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 6,
    fontSize: 11,
    color: '#334155',
    maxWidth: 72,
    textAlign: 'center',
    fontWeight: '500',
  },
})
