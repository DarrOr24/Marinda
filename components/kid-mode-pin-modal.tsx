import React from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { Button, ModalDialog } from '@/components/ui'

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
    <ModalDialog visible={!!pinPrompt} onClose={onCancel} onShow={() => onChangePinValue('')} size="sm">
      <View style={styles.pinContent}>
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
          <Button title="Cancel" type="ghost" size="md" onPress={onCancel} />
          <Button title="Unlock" type="primary" size="md" onPress={onSubmit} />
        </View>
      </View>
    </ModalDialog>
  )
}

const styles = StyleSheet.create({
  pinContent: {
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
})
