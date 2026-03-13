import React, { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import ActivityBoard from '@/components/boards/activity-board'
import AnnouncementsBoard from '@/components/boards/announcements-board'
import GroceryBoard from '@/components/boards/grocery-board'

type BoardKey = 'grocery' | 'announcements' | 'activity'

type BoardTab = {
  key: BoardKey
  label: string
}

const BOARD_TABS: BoardTab[] = [
  { key: 'grocery', label: 'Groceries' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'activity', label: 'Activities' },
]

export default function BoardsTabScreen() {
  const [activeBoard, setActiveBoard] = useState<BoardKey>('grocery')

  const content = useMemo(() => {
    if (activeBoard === 'announcements') return <AnnouncementsBoard />
    if (activeBoard === 'activity') return <ActivityBoard />
    return <GroceryBoard />
  }, [activeBoard])

  return (
    <View style={styles.container}>
      <View style={styles.topTabs}>
        {BOARD_TABS.map((tab) => {
          const isActive = tab.key === activeBoard

          return (
            <Pressable
              key={tab.key}
              style={[styles.topTab, isActive && styles.topTabActive]}
              onPress={() => setActiveBoard(tab.key)}
            >
              <Text style={[styles.topTabText, isActive && styles.topTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.content}>{content}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  topTab: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  topTabActive: {
    backgroundColor: '#dbeafe',
  },
  topTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  topTabTextActive: {
    color: '#1d4ed8',
  },
  content: {
    flex: 1,
  },
})
