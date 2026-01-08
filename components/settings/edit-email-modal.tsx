// components/settings/edit-email-modal.tsx
import { useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { Button } from '@/components/ui/button'
import { isValidEmail } from '@/utils/validation.utils'


type Props = {
  visible: boolean
  initialEmail: string
  loading?: boolean

  onClose: () => void
  onSave: (nextEmail: string) => Promise<void> | void
}

export function EditEmailModal({
  visible,
  initialEmail,
  loading = false,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(initialEmail)

  const normalizedInitial = useMemo(() => initialEmail.trim().toLowerCase(), [initialEmail])
  const normalizedDraft = useMemo(() => draft.trim().toLowerCase(), [draft])

  const hasChange = normalizedDraft !== normalizedInitial
  const canSave = isValidEmail(normalizedDraft) && hasChange && !loading

  const showInvalid = draft.trim().length > 0 && !isValidEmail(draft)

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      onShow={() => setDraft(initialEmail)}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.card}>
        <Text style={styles.title}>Change email</Text>
        <Text style={styles.subtitle}>
          We’ll send a verification link to the new address.
        </Text>

        <Text style={[styles.label, { marginTop: 14 }]}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={draft}
          onChangeText={setDraft}
          placeholder="you@example.com"
          style={styles.input}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!canSave) return
            void onSave(normalizedDraft)
          }}
        />

        {showInvalid && (
          <Text style={styles.errorText}>Please enter a valid email.</Text>
        )}

        <View style={styles.actions}>
          <Button
            title={loading ? 'Saving…' : 'Save'}
            type="primary"
            size="lg"
            onPress={() => void onSave(normalizedDraft)}
            disabled={!canSave}
            fullWidth
          />

          <Button
            title="Cancel"
            type="ghost"
            size="lg"
            onPress={() => {
              setDraft(initialEmail)
              onClose()
            }}
            disabled={loading}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },

  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '28%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 16,
    color: '#0f172a',
  },

  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#b91c1c',
  },

  actions: {
    marginTop: 14,
    gap: 10,
  },
})
