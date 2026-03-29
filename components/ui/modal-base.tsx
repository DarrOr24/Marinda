import React from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'

export type ModalBaseProps = {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  closeOnBackdropPress?: boolean
  onShow?: () => void
  backdropTone?: 'default' | 'soft'
  avoidKeyboard?: boolean
  keyboardVerticalOffset?: number
}

export function ModalBase({
  visible,
  onClose,
  children,
  closeOnBackdropPress = true,
  onShow,
  backdropTone = 'default',
  avoidKeyboard = false,
  keyboardVerticalOffset = 0,
}: ModalBaseProps) {
  const Container = avoidKeyboard ? KeyboardAvoidingView : View

  const handleBackdropPress = () => {
    Keyboard.dismiss()
    if (closeOnBackdropPress) {
      onClose()
    }
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      onShow={onShow}
    >
      <View style={modalBaseStyles.root}>
        <Pressable
          style={[
            modalBaseStyles.overlay,
            backdropTone === 'soft'
              ? modalBaseStyles.popoverOverlay
              : modalBaseStyles.defaultOverlay,
          ]}
          onPress={handleBackdropPress}
        />
        <Container
          {...(avoidKeyboard
            ? {
                behavior: 'padding' as const,
                keyboardVerticalOffset,
              }
            : {})}
          style={modalBaseStyles.contentLayer}
          pointerEvents="box-none"
        >
          {children}
        </Container>
      </View>
    </Modal>
  )
}

export const modalBaseStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentLayer: {
    flex: 1,
  },
  defaultOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  popoverOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
})
