// app/settings/index.tsx
import { Ionicons } from '@expo/vector-icons'
import { Href, useRouter } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { MemberAvatar } from '@/components/avatar/member-avatar'
import { Screen } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useProfile } from '@/lib/profiles/profiles.hooks'


type Item = {
  key: string
  title: string
  description: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  href: Href
}

const ITEMS: Item[] = [
  {
    key: 'account',
    title: 'Account',
    description: 'Profile, email, delete account',
    icon: 'person-circle-outline',
    href: '/settings/account',
  },
  {
    key: 'email',
    title: 'Email',
    description: 'Email settings',
    icon: 'mail-outline',
    href: '/settings/email',
  },
  {
    key: 'member',
    title: 'My family member',
    description: 'Nickname, theme color',
    icon: 'happy-outline',
    href: '/settings/member',
  },
  {
    key: 'family',
    title: 'Family',
    description: 'Manage members and family code',
    icon: 'people-outline',
    href: '/settings/family',
  },
  {
    key: 'shopping-lists',
    title: 'Shopping lists',
    description: 'Rename or delete custom lists on the Shopping board',
    icon: 'cart-outline',
    href: '/shopping/settings',
  },
  {
    key: 'kid-mode-pin',
    title: 'Kid mode PIN',
    description: 'Set or change the PIN used to exit kid mode',
    icon: 'lock-closed-outline',
    href: '/settings/kid-mode-pin',
  },
  {
    key: 'billing',
    title: 'Billing',
    description: 'Subscription and payment methods',
    icon: 'card-outline',
    href: '/settings/billing',
  },
]

export default function SettingsIndex() {
  const router = useRouter()
  const { effectiveMember, hasParentPermissions } = useAuthContext()
  const profileId = effectiveMember?.profile_id ?? null
  const { data: profile } = useProfile(profileId)
  const visibleItems = hasParentPermissions
    ? ITEMS
    : ITEMS.filter(
        item => item.key !== 'kid-mode-pin' && item.key !== 'shopping-lists',
      )

  const firstName = profile?.first_name ?? effectiveMember?.profile?.first_name ?? ''
  const lastName = profile?.last_name ?? effectiveMember?.profile?.last_name ?? ''

  return (
    <Screen>
      <View style={styles.avatarWrapper}>
        {effectiveMember?.id ? (
          <MemberAvatar
            memberId={effectiveMember.id}
            size="xl"
            isUpdatable={true}
          />
        ) : null}
        <Text style={styles.avatarName}>{firstName}{'\n'}{lastName}</Text>
      </View>

      <View style={styles.card}>
        {visibleItems.map((item, idx) => (
          <React.Fragment key={item.key}>
            <SettingsRow
              title={item.title}
              description={item.description}
              icon={item.icon}
              onPress={() => router.push(item.href)}
            />
            {idx !== visibleItems.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </Screen>
  )
}

function SettingsRow({
  title,
  description,
  icon,
  onPress,
}: {
  title: string
  description: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color="#0f172a" />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc} numberOfLines={2}>
          {description}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  avatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  avatarName: { fontSize: 24, fontWeight: '600', color: '#0f172a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: '#eef2f7' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rowDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 },
})
