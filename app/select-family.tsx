// app/select-family.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function SelectFamilyScreen() {
  const { memberships, setActiveFamilyId, isLoading } = useAuthContext()

  if (isLoading || !memberships) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading your families…</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your family</Text>
      <FlatList
        data={memberships}
        keyExtractor={(m) => m.familyId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setActiveFamilyId(item.familyId)}
          >
            <Text style={styles.name}>{item.familyName}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
      <View style={{ marginTop: 24 }}>
        <Text style={styles.sub}>Or start/join another family</Text>
        <View style={{ height: 10 }} />
        <TouchableOpacity style={styles.altBtn} onPress={() => location.assign('/onboarding')}>
          <Text style={styles.altBtnText}>Create / Join</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: 20, gap: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#e5e7eb', padding: 14, borderRadius: 12, backgroundColor: '#fafafa' },
  name: { fontSize: 16, fontWeight: '600' },
  role: { marginTop: 4, color: '#6b7280' },
  sub: { textAlign: 'center', color: '#6b7280' },
  altBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#2563eb' },
  altBtnText: { color: '#2563eb', fontWeight: '600' },
})
