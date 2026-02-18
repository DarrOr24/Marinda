// components/member-sidebar.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { usePathname, useRouter } from 'expo-router'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { MemberAvatar } from '@/components/avatar/member-avatar'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import type { FamilyMember } from '@/lib/members/members.types'

const SIDEBAR_WIDTH = 92
const AVATAR_SIZE = 48
const AVATAR_BORDER = 3

export default function MemberSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { activeFamilyId } = useAuthContext()
  const { familyMembers } = useFamily(activeFamilyId as string)

  const { member: currentUser } = useAuthContext()

  // Empty state: no family selected
  if (!activeFamilyId) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.muted}>No family selected yet</Text>
      </View>
    )
  }

  // Loading state
  if (familyMembers.isLoading) {
    return (
      <View style={styles.wrapper}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading family…</Text>
      </View>
    )
  }

  // Error state
  if (familyMembers.isError) {
    console.error('Failed to load members', familyMembers.error)
    return (
      <View style={styles.wrapper}>
        <Text style={styles.error}>Failed to load members</Text>
      </View>
    )
  }

  // Raw list
  let membersData: FamilyMember[] = familyMembers.data ?? []
  if (!membersData.length) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.muted}>No members yet</Text>
      </View>
    )
  }

  // FILTER LOGIC
  if (currentUser && (currentUser.role === 'CHILD' || currentUser.role === 'TEEN')) {
    membersData = membersData.filter(m => m.id === currentUser.id)
  }

  if (currentUser && (currentUser.role === 'MOM' || currentUser.role === 'DAD')) {
    membersData = membersData.filter(
      m => m.role === 'CHILD' || m.role === 'TEEN'
    )
  }

  // Active member id from /profile/[id]
  const activeMemberId = pathname.match(/^\/profile\/(.+)$/)?.[1]

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >

        {/* CHILD / TEEN → only their own avatar */}
        {(currentUser?.role === 'CHILD' || currentUser?.role === 'TEEN') &&
          membersData.map(m => {
            const isActive = activeMemberId === m.id
            return (
              <TouchableOpacity
                key={m.id}
                style={styles.item}
                onPress={() =>
                  router.push({ pathname: '/profile/[id]', params: { id: m.id } })
                }
              >
                <View style={[styles.avatarBox, isActive && styles.avatarBoxActive]}>
                  <MemberAvatar memberId={m.id} size="sm" />
                </View>
                <Text numberOfLines={1} style={styles.name}>
                  {m.profile?.first_name}
                </Text>
              </TouchableOpacity>
            )
          })
        }

        {/* PARENT → show CURRENT kid avatar only */}
        {(currentUser?.role === 'MOM' || currentUser?.role === 'DAD') && (() => {
          const activeKid =
            membersData.find(m => m.id === activeMemberId) || membersData[0]

          if (!activeKid) return null

          const isActive = activeMemberId === activeKid.id

          return (
            <TouchableOpacity
              key={activeKid.id}
              style={styles.item}
              onPress={() =>
                router.push({ pathname: '/profile/[id]', params: { id: activeKid.id } })
              }
            >
              <View style={[styles.avatarBox, isActive && styles.avatarBoxActive]}>
                <MemberAvatar memberId={activeKid.id} size="sm" />
              </View>
              <Text numberOfLines={1} style={styles.name}>
                {activeKid.profile?.first_name}
              </Text>
            </TouchableOpacity>
          )
        })()}

        {/* NAVIGATION ITEMS */}
        <TouchableOpacity onPress={() => router.push('/chores')} style={styles.item}>
          <View style={styles.avatarBox}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={26} color="#2563eb" />
          </View>
          <Text numberOfLines={1} style={styles.name}>Chores</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/boards/grocery')} style={styles.item}>
          <View style={styles.avatarBox}>
            <MaterialCommunityIcons name="cart-outline" size={26} color="#16a34a" />
          </View>
          <Text numberOfLines={1} style={styles.name}>Groceries</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/boards/announcements')} style={styles.item}>
          <View style={styles.avatarBox}>
            <MaterialCommunityIcons name="bullhorn-outline" size={26} color="#f59e0b" />
          </View>
          <Text numberOfLines={1} style={styles.name}>Announcements</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/wishlist')} style={styles.item}>
          <View style={styles.avatarBox}>
            <MaterialCommunityIcons name="gift-outline" size={26} color="#db2777" />
          </View>
          <Text numberOfLines={1} style={styles.name}>Wish List</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/boards/activity')} style={styles.item}>
          <View style={styles.avatarBox}>
            <MaterialCommunityIcons name="calendar-month-outline" size={26} color="#7c3aed" />
          </View>
          <Text numberOfLines={1} style={styles.name}>Activities</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIDEBAR_WIDTH,
    paddingHorizontal: 12,
    paddingTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  muted: { color: '#64748b', fontSize: 12, textAlign: 'center' },
  error: { color: '#dc2626', fontSize: 12, textAlign: 'center' },

  container: {
    width: SIDEBAR_WIDTH,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRightWidth: 1,
    borderRightColor: '#d9e1f2',
    position: 'relative',
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
    borderWidth: AVATAR_BORDER,
    borderColor: 'transparent',
  },
  avatarBoxActive: {
    borderColor: '#2563eb',
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
