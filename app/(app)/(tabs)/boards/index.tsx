import React, { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'

import ActivityBoard from '@/components/boards/activity-board'
import AnnouncementsBoard from '@/components/boards/announcements-board'
import GroceryBoard from '@/components/boards/grocery-board'

type BoardKey = 'grocery' | 'announcements' | 'activity'

type BoardTab = {
  key: BoardKey
  label: string
}

const BOARD_TABS: BoardTab[] = [
  { key: 'grocery', label: 'Shopping' },
  { key: 'announcements', label: 'Bulletin' },
  { key: 'activity', label: 'Events' },
]

/** Extra horizontal space vs a ~340pt phone; scales gap and padding on larger widths. */
function tabBarSpacing(windowWidth: number) {
  const excess = Math.max(0, windowWidth - 340)
  const gap = Math.min(26, 8 + Math.round(excess / 16))
  const paddingHorizontal = Math.min(28, 12 + Math.round(excess / 20))
  return { gap, paddingHorizontal }
}

export default function BoardsTabScreen() {
  const [activeBoard, setActiveBoard] = useState<BoardKey>('grocery')
  const { width: windowWidth } = useWindowDimensions()

  const topTabsScrollMetrics = useMemo(
    () => tabBarSpacing(windowWidth),
    [windowWidth],
  )

  const content = useMemo(() => {
    if (activeBoard === 'announcements') return <AnnouncementsBoard />
    if (activeBoard === 'activity') return <ActivityBoard />
    return <GroceryBoard />
  }, [activeBoard])

  return (
    <View style={styles.container}>
      <View style={styles.topTabsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[
            styles.topTabsScrollContent,
            topTabsScrollMetrics,
          ]}
        >
          {BOARD_TABS.map((tab) => {
            const isActive = tab.key === activeBoard

            return (
              <Pressable
                key={tab.key}
                style={[styles.topTab, isActive && styles.topTabActive]}
                onPress={() => setActiveBoard(tab.key)}
              >
                <Text
                  style={[styles.topTabText, isActive && styles.topTabTextActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>{content}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topTabsBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  topTabsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
    flexGrow: 1,
    justifyContent: 'center',
  },
  topTab: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  topTabActive: {
    backgroundColor: '#dbeafe',
  },
  topTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  topTabTextActive: {
    color: '#1d4ed8',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
})
