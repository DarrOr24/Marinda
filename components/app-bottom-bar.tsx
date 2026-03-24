import { MaterialCommunityIcons } from '@expo/vector-icons'
import { usePathname, useRouter } from 'expo-router'
import React, { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuthContext } from '@/hooks/use-auth-context'

type BottomBarItem = {
  key: string
  label: string
  path: string
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  color: string
  activePrefixes?: string[]
}

export function AppBottomBar() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { isKidMode } = useAuthContext()
  const items = useMemo<BottomBarItem[]>(
    () => [
      {
        key: 'profile',
        label: 'Kids Profiles',
        path: '/profiles',
        icon: 'account-outline',
        color: '#2563eb',
        activePrefixes: ['/profiles'],
      },
      {
        key: 'chores',
        label: 'Chores',
        path: '/chores',
        icon: 'clipboard-check-outline',
        color: '#7c3aed',
        activePrefixes: ['/chores'],
      },
      {
        key: 'wishlist',
        label: 'Wishlist',
        path: '/wishlist',
        icon: 'gift-outline',
        color: '#22c55e',
        activePrefixes: ['/wishlist'],
      },
      {
        key: 'boards',
        label: 'Boards',
        path: '/boards',
        icon: 'view-dashboard-outline',
        color: '#f59e0b',
        activePrefixes: ['/boards', '/announcements', '/activity', '/grocery'],
      },
    ],
    [],
  )

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: 8 + insets.bottom,
        },
      ]}
    >
      {items.map((item) => {
        const isActive = item.activePrefixes?.some((prefix) => pathname.startsWith(prefix)) ?? pathname === item.path
        const iconColor = item.color
        const labelColor = isActive ? item.color : '#64748b'

        return (
          <Pressable
            key={item.key}
            style={[styles.item, isActive && { backgroundColor: `${item.color}14` }]}
            onPress={() => router.navigate(item.path as any)}
            accessibilityLabel={item.label}
          >
            <MaterialCommunityIcons name={item.icon} size={24} color={iconColor} />
            <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
              {item.key === 'profile' && isKidMode ? 'Profile' : item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: '#dbe3f1',
    backgroundColor: '#fff',
    paddingTop: 11,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
})
