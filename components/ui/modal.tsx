import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function useModalScrollMaxHeight(reserve = 88) {
  const { height: screenHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  return screenHeight - insets.top - insets.bottom - 14 - reserve
}

type AppModalType = 'dialog' | 'menu' | 'popover' | 'bottom-sheet'
type AppModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'menu' | 'menu-wide'
type AppModalPosition = 'center' | 'bottom' | 'top-left' | 'top-right'
type AnchorLayout = { x: number; y: number; width: number; height: number }

type Props = {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  type?: AppModalType
  size?: AppModalSize
  position?: AppModalPosition
  keyboardOffset?: number
  statusBarTranslucent?: boolean
  closeOnBackdropPress?: boolean
  avoidKeyboard?: boolean
  onShow?: () => void
  anchorRef?: React.RefObject<View | null>
}

const SURFACE_WIDTH: Record<AppModalSize, number> = {
  sm: 360,
  md: 420,
  lg: 460,
  xl: 520,
  menu: 220,
  'menu-wide': 260,
}

const CONTAINER_PADDING = 16
const POPOVER_GAP = 8

function defaultSizeForType(type: AppModalType): AppModalSize {
  if (type === 'bottom-sheet') return 'xl'
  if (type === 'menu') return 'menu'
  if (type === 'popover') return 'menu'
  return 'lg'
}

function defaultPositionForType(type: AppModalType): AppModalPosition {
  if (type === 'bottom-sheet') return 'bottom'
  if (type === 'popover') return 'top-right'
  return 'center'
}

export function AppModal({
  visible,
  onClose,
  children,
  type = 'dialog',
  size,
  position,
  keyboardOffset = 0,
  statusBarTranslucent = false,
  closeOnBackdropPress = true,
  avoidKeyboard = true,
  onShow,
  anchorRef,
}: Props) {
  const insets = useSafeAreaInsets()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const Container = avoidKeyboard ? KeyboardAvoidingView : View
  const [anchorLayout, setAnchorLayout] = useState<AnchorLayout | null>(null)

  const resolvedSize = SURFACE_WIDTH[size ?? defaultSizeForType(type)]
  const resolvedPosition = position ?? defaultPositionForType(type)
  const isMenuLike = type === 'menu' || type === 'popover'
  const isBottomSheet = resolvedPosition === 'bottom'
  const isTopAligned = resolvedPosition === 'top-left' || resolvedPosition === 'top-right'
  const isPopover = type === 'popover' || isTopAligned
  const isAnchoredPopover = isPopover && !!anchorRef?.current

  const measureAnchor = useCallback(() => {
    const anchorNode = anchorRef?.current

    if (!anchorNode || typeof anchorNode.measureInWindow !== 'function') {
      setAnchorLayout(null)
      return
    }

    anchorNode.measureInWindow((x, y, width, height) => {
      setAnchorLayout({ x, y, width, height })
    })
  }, [anchorRef])

  useEffect(() => {
    if (!visible || !isAnchoredPopover) {
      setAnchorLayout(null)
      return
    }

    const frame = requestAnimationFrame(() => {
      measureAnchor()
    })

    return () => cancelAnimationFrame(frame)
  }, [visible, isAnchoredPopover, measureAnchor, screenWidth, screenHeight])

  const justifyContent = isBottomSheet
    ? 'flex-end'
    : isTopAligned
      ? 'flex-start'
      : 'center'

  const alignItems =
    resolvedPosition === 'top-left'
      ? 'flex-start'
      : 'center'

  const handleBackdropPress = () => {
    Keyboard.dismiss()
    if (closeOnBackdropPress) {
      onClose()
    }
  }

  const anchorTop = anchorLayout ? anchorLayout.y + anchorLayout.height + POPOVER_GAP : null
  const containerPaddingTop = isTopAligned
    ? Math.max(CONTAINER_PADDING + insets.top, anchorTop ?? 0)
    : 16 + insets.top

  const containerPaddingBottom = isBottomSheet
    ? 12 + insets.bottom
    : 16 + insets.bottom

  const maxHeight =
    screenHeight - containerPaddingTop - containerPaddingBottom - 12
  const boundedWidth = Math.min(resolvedSize, screenWidth - CONTAINER_PADDING * 2)

  const anchoredContentStyle = useMemo(() => {
    if (!anchorLayout || !isTopAligned) return null

    if (resolvedPosition === 'top-left') {
      return {
        paddingLeft: Math.max(0, anchorLayout.x - CONTAINER_PADDING),
      }
    }

    return {
      paddingRight: Math.max(
        0,
        screenWidth - CONTAINER_PADDING - anchorLayout.x - anchorLayout.width,
      ),
    }
  }, [anchorLayout, isTopAligned, resolvedPosition, screenWidth])

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={statusBarTranslucent}
      onShow={() => {
        if (isAnchoredPopover) {
          measureAnchor()
        }
        onShow?.()
      }}
    >
      <Pressable
        style={[
          styles.overlay,
          isPopover ? styles.popoverOverlay : styles.defaultOverlay,
        ]}
        onPress={handleBackdropPress}
      />

      <Container
        {...(avoidKeyboard
          ? {
              behavior: 'padding' as const,
              keyboardVerticalOffset: keyboardOffset,
            }
          : {})}
        style={[
          styles.container,
          {
            justifyContent,
            alignItems,
            paddingTop: containerPaddingTop,
            paddingBottom: containerPaddingBottom,
          },
        ]}
      >
        <View
          style={[
            styles.content,
            isTopAligned
              ? resolvedPosition === 'top-left'
                ? styles.contentLeft
                : styles.contentRight
              : styles.contentCenter,
            anchoredContentStyle,
            isAnchoredPopover && !anchorLayout ? styles.hiddenContent : null,
          ]}
        >
          <View
            style={[
              styles.surface,
              isMenuLike ? styles.menuSurface : styles.dialogSurface,
              isBottomSheet ? styles.bottomSheetSurface : null,
              {
                width: isBottomSheet ? '100%' : undefined,
                minWidth: isBottomSheet ? undefined : boundedWidth,
                maxWidth: screenWidth - CONTAINER_PADDING * 2,
                maxHeight,
              },
            ]}
          >
            {children}
          </View>
        </View>
      </Container>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  defaultOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  popoverOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  container: {
    flex: 1,
    paddingHorizontal: CONTAINER_PADDING,
  },
  content: {
    width: '100%',
    minHeight: 0,
  },
  contentCenter: {
    alignItems: 'center',
  },
  contentRight: {
    alignItems: 'flex-end',
  },
  contentLeft: {
    alignItems: 'flex-start',
  },
  hiddenContent: {
    opacity: 0,
  },
  surface: {
    flexGrow: 0,
    flexShrink: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  dialogSurface: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  menuSurface: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  bottomSheetSurface: {
    borderRadius: 20,
  },
})
