// app/onboarding/select-family.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { Href, useRouter } from 'expo-router'
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { FamilyAvatar } from '@/components/avatar/family-avatar'
import { Button, Screen, ScreenState } from '@/components/ui'

export default function SelectFamilyScreen() {
  const { memberships, setActiveFamilyId, isLoading } = useAuthContext()
  const router = useRouter()

  if (isLoading || !memberships) {
    return (
      <ScreenState
        title="Choose your family"
        description="Loading your families."
        showActivityIndicator
        withBackground={false}
      />
    )
  }

  return (
    <Screen withBackground={false} scroll={false} gap="no">
      <Text style={styles.title}>Choose your family</Text>

      <FlatList
        data={memberships}
        keyExtractor={(m) => m.familyId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.familyRow}
            onPress={async () => {
              await setActiveFamilyId(item.familyId)
              router.replace('/')
            }}
            activeOpacity={0.7}
          >
            <FamilyAvatar
              familyId={item.familyId}
              size="lg"
              isUpdatable={false}
            />
            <Text style={styles.familyName}>{item.familyName}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          <View style={styles.createJoinSection}>
            <Text style={styles.sub}>Or start/join another family</Text>
            <Button
              title="Create / Join"
              size="lg"
              onPress={() => router.push('/onboarding/create-or-join' as Href)}
            />
          </View>
        }
        style={styles.list}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 14,
  },
  familyName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  separator: {
    height: 10,
  },
  createJoinSection: {
    marginTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
})
