import React, { useEffect, useState } from 'react'
import {
  Alert,
  StyleSheet,
  View,
} from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { Button, ModalDialog, TextInput } from '@/components/ui'
import { KID_MODE_PIN_PATTERN } from '@/utils/validation.utils'

type Props = {
  visible: boolean
  title: string
  message: string
  onCancel: () => void
  onSubmit: (pin: string) => void | Promise<void>
}

export function KidModePinModal({
  visible,
  title,
  message,
  onCancel,
  onSubmit,
}: Props) {
  const [pinValue, setPinValue] = useState('')

  useEffect(() => {
    if (visible) {
      setPinValue('')
    }
  }, [visible])

  const handleSubmit = () => {
    if (!KID_MODE_PIN_PATTERN.test(pinValue)) {
      Alert.alert('Choose a 4-digit PIN', 'Please enter exactly 4 digits.')
      return
    }

    void onSubmit(pinValue)
  }

  return (
    <ModalDialog visible={visible} onClose={onCancel} size="sm">
      <View style={styles.pinContent}>
        <ThemedText variant="title">
          {title}
        </ThemedText>
        <ThemedText variant="bodySmall" tone="muted">
          {message}
        </ThemedText>

        <TextInput
          value={pinValue}
          onChangeText={setPinValue}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          placeholder="1234"
        />

        <View style={styles.pinActions}>
          <Button title="Cancel" type="ghost" size="md" onPress={onCancel} />
          <Button title="Unlock" type="primary" size="md" onPress={handleSubmit} />
        </View>
      </View>
    </ModalDialog>
  )
}

const styles = StyleSheet.create({
  pinContent: {
    gap: 12,
  },
  pinActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
})
