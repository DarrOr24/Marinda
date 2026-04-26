import { MaterialCommunityIcons } from '@expo/vector-icons'
import { usePathname, useRouter } from 'expo-router'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuthContext } from '@/hooks/use-auth-context'
import { useRtlStyles } from '@/hooks/use-rtl-styles'

type BottomBarItem = {
  key: string
  labelKey: string
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
  const { t } = useTranslation()
  const r = useRtlStyles()
  const items = useMemo<BottomBarItem[]>(
    () => [
      {
        key: 'profile',
        labelKey: 'navigation.tabs.kids',
        path: '/profiles',
        icon: 'account-outline',
        color: '#2563eb',
        activePrefixes: ['/profiles'],
      },
      {
        key: 'chores',
        labelKey: 'navigation.tabs.chores',
        path: '/chores',
        icon: 'clipboard-check-outline',
        color: '#7c3aed',
        activePrefixes: ['/chores'],
      },
      {
        key: 'wishlist',
        labelKey: 'navigation.tabs.wishes',
        path: '/wishlist',
        icon: 'gift-outline',
        color: '#22c55e',
        activePrefixes: ['/wishlist'],
      },
      {
        key: 'boards',
        labelKey: 'navigation.tabs.boards',
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
        r.row,
        {
          paddingBottom: 8 + insets.bottom,
        },
      ]}
    >
      {items.map((item) => {
        const isActive = item.activePrefixes?.some((prefix) => pathname.startsWith(prefix)) ?? pathname === item.path
        const iconColor = item.color
        const labelColor = isActive ? item.color : '#64748b'
        const label = item.key === 'profile' && isKidMode
          ? t('navigation.tabs.profile')
          : t(item.labelKey)

        return (
          <Pressable
            key={item.key}
            style={[styles.item, isActive && { backgroundColor: `${item.color}14` }]}
            onPress={() => router.navigate(item.path as any)}
            accessibilityLabel={label}
          >
            <MaterialCommunityIcons name={item.icon} size={24} color={iconColor} />
            <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
              {label}
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
