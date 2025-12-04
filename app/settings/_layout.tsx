// app/settings/_layout.tsx
import CheckerboardBackground from '@/components/checkerboard-background'
import { Slot, usePathname, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type TabKey = 'account' | 'family' | 'billing'

export default function SettingsLayout() {
  const pathname = usePathname()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabKey>('account')

  // derive active tab from current route
  useEffect(() => {
    if (pathname.startsWith('/settings/family')) setActiveTab('family')
    else if (pathname.startsWith('/settings/billing')) setActiveTab('billing')
    else setActiveTab('account')
  }, [pathname])

  const goTo = (tab: TabKey) => {
    setActiveTab(tab)
    if (tab === 'account') router.push('/settings/account')
    if (tab === 'family') router.push('/settings/family')
    if (tab === 'billing') router.push('/settings/billing')
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.center}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TabButton
            label="Account"
            isActive={activeTab === 'account'}
            onPress={() => goTo('account')}
          />
          <TabButton
            label="Family"
            isActive={activeTab === 'family'}
            onPress={() => goTo('family')}
          />
          <TabButton
            label="Billing"
            isActive={activeTab === 'billing'}
            onPress={() => goTo('billing')}
          />
        </View>

        {/* Active settings page */}
        <Slot />
      </ScrollView>
    </SafeAreaView>
  )
}

function TabButton({
  label,
  isActive,
  onPress,
}: {
  label: string
  isActive: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
    >
      <Text
        style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E6F4FE',
  },
  center: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 16,
  },

  tabsRow: {
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    padding: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1d4ed8',
  },
  tabButtonTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
})
