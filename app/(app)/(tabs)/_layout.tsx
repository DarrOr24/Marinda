import { Tabs } from 'expo-router'
import React from 'react'

import { AppBottomBar } from '@/components/app-bottom-bar'

export default function AppTabsLayout() {
  return (
    <Tabs
      tabBar={() => <AppBottomBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="profiles/index" />
      <Tabs.Screen name="chores/index" />
      <Tabs.Screen name="wishlist/index" />
      <Tabs.Screen name="boards/index" />
    </Tabs>
  )
}
