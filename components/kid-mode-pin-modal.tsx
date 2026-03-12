import React from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export type KidModePinPrompt = {
  title: string
  message: string
}

type Props = {
  pinPrompt: KidModePinPrompt | null
  pinValue: string
  onChangePinValue: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}

export function KidModePinModal({
  pinPrompt,
  pinValue,
  onChangePinValue,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!pinPrompt}
      onRequestClose={onCancel}
    >
      <View style={styles.pinOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.pinCard}>
          <Text style={styles.pinTitle}>{pinPrompt?.title}</Text>
          <Text style={styles.pinMessage}>{pinPrompt?.message}</Text>

          <TextInput
            value={pinValue}
            onChangeText={onChangePinValue}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="1234"
            style={styles.pinInput}
          />

          <View style={styles.pinActions}>
            <TouchableOpacity style={styles.pinSecondaryButton} onPress={onCancel}>
              <Text style={styles.pinSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pinPrimaryButton} onPress={onSubmit}>
              <Text style={styles.pinPrimaryText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  pinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pinCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  pinMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  pinActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  pinPrimaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pinPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  pinSecondaryButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pinSecondaryText: {
    color: '#0f172a',
    fontWeight: '700',
  },
})
