// app/signup/details.tsx
import { useSignUpFlow } from '@/providers/signup-flow-provider'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function SignUpDetailsScreen() {
  const router = useRouter()
  const { details, setDetails } = useSignUpFlow()
  const [uploading, setUploading] = useState(false)

  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (!res.canceled && res.assets?.[0]) {
      // TODO: upload to Supabase Storage and set the public URL
      // For now, store local uri (works for preview; replace with uploaded URL in production)
      setDetails({ avatar_url: res.assets[0].uri })
    }
  }

  const nameOk = details.first_name.trim().length >= 2 && details.last_name.trim().length >= 2
  const genderOk = details.gender === 'MALE' || details.gender === 'FEMALE'
  const birthOk = !details.birth_date || /^\d{4}-\d{2}-\d{2}$/.test(details.birth_date) // optional
  const canNext = nameOk && genderOk && birthOk

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.subtitle}>We’ll create your profile with these details.</Text>

      <View style={styles.row}>
        <Text style={styles.label}>First name</Text>
        <TextInput
          style={styles.input}
          value={details.first_name}
          onChangeText={(v) => setDetails({ first_name: v })}
          placeholder="Or"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Last name</Text>
        <TextInput
          style={styles.input}
          value={details.last_name}
          onChangeText={(v) => setDetails({ last_name: v })}
          placeholder="Bar"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Gender</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.choice, details.gender === 'MALE' && styles.choiceActive]}
            onPress={() => setDetails({ gender: 'MALE' })}
          >
            <Text style={[styles.choiceText, details.gender === 'MALE' && styles.choiceTextActive]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choice, details.gender === 'FEMALE' && styles.choiceActive]}
            onPress={() => setDetails({ gender: 'FEMALE' })}
          >
            <Text style={[styles.choiceText, details.gender === 'FEMALE' && styles.choiceTextActive]}>Female</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Birth date</Text>
        <TextInput
          style={styles.input}
          value={details.birth_date}
          onChangeText={(v) => setDetails({ birth_date: v })}
          placeholder="YYYY-MM-DD (optional)"
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <TouchableOpacity style={styles.outline} onPress={pickAvatar} disabled={uploading}>
        {uploading ? <ActivityIndicator /> : <Text style={styles.outlineText}>{details.avatar_url ? 'Change photo' : 'Add a photo'}</Text>}
      </TouchableOpacity>

      {!canNext && (
        <Text style={styles.hint}>Enter first & last name, choose gender, and use YYYY-MM-DD for date.</Text>
      )}

      <TouchableOpacity
        style={[styles.primary, !canNext && { opacity: 0.6 }]}
        disabled={!canNext}
        onPress={() => router.push('/signup/credentials')}
      >
        <Text style={styles.primaryText}>Next</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 12 },
  row: { gap: 6 },
  label: { fontWeight: '500', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  choice: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#FFF' },
  choiceActive: { borderColor: '#2563eb', backgroundColor: '#EFF6FF' },
  choiceText: { color: '#374151', fontWeight: '600' },
  choiceTextActive: { color: '#2563eb' },
  outline: { borderWidth: 1, borderColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  outlineText: { color: '#2563eb', fontWeight: '700' },
  hint: { color: '#9ca3af', fontSize: 12 },
  primary: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '700' },
})
