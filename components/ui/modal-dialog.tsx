import React, { useEffect, useState } from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type KeyboardEventName,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ModalBase } from './modal-base'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

type DialogPresentation = 'center' | 'bottom-sheet'

const CONTAINER_PADDING = 16

const SURFACE_WIDTH: Record<ModalSize, number> = {
  sm: 360,
  md: 420,
  lg: 460,
  xl: 520,
}

function getDialogWidth(size: ModalSize, screenWidth: number) {
  return Math.min(SURFACE_WIDTH[size], screenWidth - CONTAINER_PADDING * 2)
}

type ModalDialogProps = {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  closeOnBackdropPress?: boolean
  onShow?: () => void
  title?: React.ReactNode
  showCloseButton?: boolean
  scrollable?: boolean
  size?: ModalSize
  presentation?: DialogPresentation
  avoidKeyboard?: boolean
}

export function ModalDialog({
  visible,
  onClose,
  children,
  title,
  showCloseButton = false,
  scrollable = false,
  size,
  presentation = 'center',
  closeOnBackdropPress = true,
  avoidKeyboard = true,
  onShow,
}: ModalDialogProps) {
  const insets = useSafeAreaInsets()
  const { height: screenHeight, width: screenWidth } = useWindowDimensions()
  const resolvedSize = size ?? (presentation === 'bottom-sheet' ? 'xl' : 'lg')
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [modalBaseHeight, setModalBaseHeight] = useState(() => Dimensions.get('window').height)
  const isBottomSheet = presentation === 'bottom-sheet'
  const keyboardVerticalOffset = avoidKeyboard && !isBottomSheet ? 12 : 0

  useEffect(() => {
    if (!visible || !avoidKeyboard || isBottomSheet) {
      setKeyboardVisible(false)
      return
    }

    const showEvent: KeyboardEventName = 'keyboardDidShow'
    const hideEvent: KeyboardEventName = 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [avoidKeyboard, isBottomSheet, visible])

  useEffect(() => {
    if (!visible) return
    setModalBaseHeight(Dimensions.get('window').height)
  }, [visible, screenWidth])

  const shouldTopAlignForKeyboard = visible && keyboardVisible && avoidKeyboard && !isBottomSheet
  const paddingTop = 16 + insets.top
  const paddingBottom = isBottomSheet
    ? 12 + insets.bottom
    : shouldTopAlignForKeyboard
      ? 20
      : 20 + insets.bottom
  const surfaceScreenHeight = shouldTopAlignForKeyboard ? modalBaseHeight : screenHeight
  const maxHeight = surfaceScreenHeight - paddingTop - paddingBottom
  const renderedTitle =
    typeof title === 'string' ? <Text style={dialogStyles.standardTitle}>{title}</Text> : title
  const usesStandardDialogLayout = title !== undefined || showCloseButton || scrollable
  const boundedWidth = getDialogWidth(resolvedSize, screenWidth)

  const bodyContent = scrollable ? (
    <View style={dialogStyles.standardBodyScrollable}>
      <ScrollView
        style={dialogStyles.standardScrollView}
        contentContainerStyle={dialogStyles.standardScrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        <View style={dialogStyles.childrenContainer}>{children}</View>
      </ScrollView>
    </View>
  ) : (
    <View style={dialogStyles.childrenContainer}>{children}</View>
  )

  const content = usesStandardDialogLayout ? (
    <View style={dialogStyles.standardLayout}>
      {title !== undefined || showCloseButton ? (
        <View style={dialogStyles.standardHeader}>
          <View style={dialogStyles.standardHeaderMain}>{renderedTitle ?? <View />}</View>
          {showCloseButton ? (
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              style={dialogStyles.standardHeaderCloseButton}
            >
              <MaterialCommunityIcons
                name="close"
                size={22}
                color="#64748b"
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {bodyContent}
    </View>
  ) : (
    children
  )

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      onShow={onShow}
      closeOnBackdropPress={closeOnBackdropPress}
      avoidKeyboard={avoidKeyboard}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View
        style={[
          dialogStyles.container,
          {
            justifyContent: isBottomSheet
              ? 'flex-end'
              : shouldTopAlignForKeyboard
                ? 'flex-start'
                : 'center',
            alignItems: 'center',
            paddingTop,
            paddingBottom,
          },
        ]}
      >
        <View style={[dialogStyles.content, dialogStyles.contentCenter]}>
          <View
            style={[
              dialogStyles.surface,
              dialogStyles.dialogSurfaceShadow,
              isBottomSheet ? dialogStyles.bottomSheetSurface : null,
              {
                width: isBottomSheet ? '100%' : undefined,
                minWidth: isBottomSheet ? undefined : boundedWidth,
                maxWidth: screenWidth - CONTAINER_PADDING * 2,
              },
            ]}
          >
            <View
              style={[
                dialogStyles.surfaceClip,
                dialogStyles.dialogSurface,
                isBottomSheet ? dialogStyles.bottomSheetSurface : null,
                {
                  width: '100%',
                  maxHeight,
                },
              ]}
            >
              {content}
            </View>
          </View>
        </View>
      </View>
    </ModalBase>
  )
}

const dialogStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: CONTAINER_PADDING,
  },
  content: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  contentCenter: {
    alignItems: 'center',
  },
  surface: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  surfaceClip: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  dialogSurfaceShadow: {
    borderRadius: 20,
  },
  dialogSurface: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bottomSheetSurface: {
    borderRadius: 20,
  },
  childrenContainer: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  standardLayout: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
    width: '100%' as const,
  },
  standardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  standardHeaderMain: {
    flex: 1,
    minWidth: 0,
  },
  standardHeaderCloseButton: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  standardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  standardBodyScrollable: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  standardScrollView: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  standardScrollContent: {
    paddingBottom: 4,
  },
})
