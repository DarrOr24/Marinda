// components/member-sidebar.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { usePathname, useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import MemberAvatar from '@/components/member-avatar'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime'
import type { Member } from '@/lib/families/families.types'
import { useState } from 'react'

const SIDEBAR_WIDTH = 92
const AVATAR_SIZE = 48
const AVATAR_BORDER = 3

export default function MemberSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { activeFamilyId } = useAuthContext()
  const { members } = useFamily(activeFamilyId || undefined)
  const { member: currentUser } = useAuthContext()

  const [showKidSwitcher, setShowKidSwitcher] = useState(false);

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

  // Raw list
  let membersData: Member[] = members.data ?? [];
  if (!membersData.length) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.muted}>No members yet</Text>
      </View>
    );
  }

  // ─────────────────────────────
  // FILTER LOGIC
  // ─────────────────────────────

  // 1) If kid/teen → show ONLY themselves
  if (currentUser && (currentUser.role === 'CHILD' || currentUser.role === 'TEEN')) {
    membersData = membersData.filter(m => m.id === currentUser.id);
  }

  // 2) If parent → show ONLY kids (no parents)
  if (currentUser && (currentUser.role === 'MOM' || currentUser.role === 'DAD')) {
    membersData = membersData.filter(
      m => m.role === 'CHILD' || m.role === 'TEEN'
    );
  }


  // 🔥 Correct: check for CHILD role
  // Kids (CHILD or TEEN) can only see themselves
  if (currentUser && (currentUser.role === 'CHILD' || currentUser.role === 'TEEN')) {
    membersData = membersData.filter(m => m.id === currentUser.id);
  }

  // Active route checks
  const isHomeActive = pathname === '/' || pathname === '/index'
  const activeMemberId = pathname.match(/^\/profile\/(.+)$/)?.[1]

  // Main sidebar UI (formerly Sidebar.tsx)
  return (
    <View style={styles.container}>

      {/* MAIN SCROLL AREA */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >

        {/* CHILD / TEEN → only their own avatar */}
        {(currentUser?.role === 'CHILD' || currentUser?.role === 'TEEN') &&
          membersData.map((m, idx) => {
            const isActive = activeMemberId === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={styles.item}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/profile/[id]', params: { id: m.id } })
                }
              >
                <View style={[styles.avatarBox, isActive && styles.avatarBoxActive]}>
                  <View style={styles.memberAvatarInner}>
                    <MemberAvatar member={m} index={idx} />
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.name}>
                  {m.profile?.first_name}
                </Text>
              </TouchableOpacity>
            );
          })
        }

        {/* PARENT → show active kid avatar only */}
        {(currentUser?.role === 'MOM' || currentUser?.role === 'DAD') && (
          (() => {
            const activeKid =
              membersData.find(m => m.id === activeMemberId) || membersData[0];

            return (
              <TouchableOpacity
                key={activeKid.id}
                style={styles.item}
                onPress={() => setShowKidSwitcher(prev => !prev)}
              >
                <View
                  style={[
                    styles.avatarBox,
                    activeMemberId === activeKid.id && styles.avatarBoxActive,
                  ]}
                >
                  <View style={styles.memberAvatarInner}>
                    <MemberAvatar member={activeKid} index={0} />
                  </View>
                </View>

                <Text numberOfLines={1} style={styles.name}>
                  {activeKid.profile?.first_name} {activeKid.profile?.last_name}
                </Text>
              </TouchableOpacity>
            );
          })()
        )}

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

        <TouchableOpacity onPress={() => router.push('/wishList')} style={styles.item}>
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

      {/* DROPDOWN OUTSIDE THE SCROLLVIEW → NO MORE CLIPPING */}
      {(currentUser?.role === 'MOM' || currentUser?.role === 'DAD') && showKidSwitcher && (
        <View style={styles.switcherBox}>
          {membersData.map(m => (
            <Pressable
              key={m.id}
              onPress={() => {
                setShowKidSwitcher(false);
                router.push({ pathname: '/profile/[id]', params: { id: m.id } });
              }}
              style={({ pressed }) => [
                styles.switcherItem,
                pressed && styles.switcherItemPressed
              ]}
            >
              <View style={styles.switcherRow}>
                <View style={styles.switcherAvatar}>
                  <MemberAvatar member={m} index={0} />
                </View>

                <Text style={styles.switcherText}>
                  {m.profile?.first_name}
                </Text>
              </View>
            </Pressable>
          ))}

        </View>
      )}


    </View>
  );

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
  switcherBox: {
    position: 'absolute',
    left: SIDEBAR_WIDTH - 6,   // move the list a bit RIGHT of the sidebar
    top: 6,
    zIndex: 9999,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  switcherItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  switcherItemPressed: {
    backgroundColor: '#f1f5f9',  // light slate highlight
  },

  switcherText: {
    textAlign: 'left',
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    flexShrink: 1,
    lineHeight: 16,
  },
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switcherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
