import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEventName,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
  title?: React.ReactNode
  showCloseButton?: boolean
  scrollable?: boolean
  type?: AppModalType
  size?: AppModalSize
  position?: AppModalPosition
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
  title,
  showCloseButton = false,
  scrollable = false,
  type = 'dialog',
  size,
  position,
  closeOnBackdropPress = true,
  avoidKeyboard = true,
  onShow,
  anchorRef,
}: Props) {
  const insets = useSafeAreaInsets()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const Container = avoidKeyboard ? KeyboardAvoidingView : View
  const [anchorLayout, setAnchorLayout] = useState<AnchorLayout | null>(null)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [modalBaseHeight, setModalBaseHeight] = useState(() => Dimensions.get('window').height)

  const resolvedSize = SURFACE_WIDTH[size ?? defaultSizeForType(type)]
  const resolvedPosition = position ?? defaultPositionForType(type)
  const isMenuLike = type === 'menu' || type === 'popover'
  const isBottomSheet = resolvedPosition === 'bottom'
  const isTopAligned = resolvedPosition === 'top-left' || resolvedPosition === 'top-right'
  const isPopover = type === 'popover' || isTopAligned
  const isAnchoredPopover = isPopover && !!anchorRef?.current
  const keyboardVerticalOffset = avoidKeyboard && !isMenuLike && !isBottomSheet ? 12 : 0
  const androidAnchorOffset = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : 0

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

  useEffect(() => {
    if (!visible || !avoidKeyboard || isMenuLike || isBottomSheet || isTopAligned) {
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
  }, [avoidKeyboard, isBottomSheet, isMenuLike, isTopAligned, visible])

  useEffect(() => {
    if (!visible) return
    setModalBaseHeight(Dimensions.get('window').height)
  }, [visible, screenWidth])

  const shouldTopAlignForKeyboard =
    visible && keyboardVisible && avoidKeyboard && !isMenuLike && !isBottomSheet && !isTopAligned

  const justifyContent = isBottomSheet
    ? 'flex-end'
    : isTopAligned
      ? 'flex-start'
      : shouldTopAlignForKeyboard
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

  const anchorTop = anchorLayout
    ? anchorLayout.y + anchorLayout.height + POPOVER_GAP + androidAnchorOffset
    : null
  const containerPaddingTop = isTopAligned
    ? Math.max(CONTAINER_PADDING + insets.top, anchorTop ?? 0)
    : 16 + insets.top

  const containerPaddingBottom = isBottomSheet
    ? 12 + insets.bottom
    : 16 + insets.bottom

  const surfaceScreenHeight = shouldTopAlignForKeyboard ? modalBaseHeight : screenHeight
  const maxHeight =
    surfaceScreenHeight - containerPaddingTop - containerPaddingBottom
  const boundedWidth = Math.min(resolvedSize, screenWidth - CONTAINER_PADDING * 2)
  const usesStandardDialogLayout =
    !isMenuLike && (title !== undefined || showCloseButton || scrollable)

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

  const renderedTitle =
    typeof title === 'string' ? <Text style={styles.standardTitle}>{title}</Text> : title

  const bodyContent = scrollable ? (
    <View style={styles.standardBodyScrollable}>
      <ScrollView
        style={styles.standardScrollView}
        contentContainerStyle={styles.standardScrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        <View style={styles.childrenContainer}>{children}</View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.childrenContainer}>{children}</View>
  )

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
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
            keyboardVerticalOffset,
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
              isMenuLike ? styles.menuSurfaceShadow : styles.dialogSurfaceShadow,
              isBottomSheet ? styles.bottomSheetSurface : null,
              {
                width: isBottomSheet ? '100%' : undefined,
                minWidth: isBottomSheet ? undefined : boundedWidth,
                maxWidth: screenWidth - CONTAINER_PADDING * 2,
              },
            ]}
          >
            <View
              style={[
                styles.surfaceClip,
                isMenuLike ? styles.menuSurface : styles.dialogSurface,
                isBottomSheet ? styles.bottomSheetSurface : null,
                {
                  width: isMenuLike ? undefined : '100%',
                  maxHeight,
                  paddingBottom: isMenuLike ? undefined : CONTAINER_PADDING,
                },
              ]}
            >
              {usesStandardDialogLayout ? (
                <View style={styles.standardLayout}>
                  {title !== undefined || showCloseButton ? (
                    <View style={styles.standardHeader}>
                      <View style={styles.standardHeaderMain}>
                        {renderedTitle ?? <View />}
                      </View>
                      {showCloseButton ? (
                        <Pressable
                          onPress={onClose}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Close modal"
                          style={styles.standardHeaderCloseButton}
                        >
                          <MaterialCommunityIcons name="close" size={22} color="#64748b" />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {bodyContent}
                </View>
              ) : (
                children
              )}
            </View>
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
    flex: 1,
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
  childrenContainer: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  standardLayout: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
    width: '100%',
  },
  standardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  dialogSurfaceShadow: {
    borderRadius: 20,
  },
  dialogSurface: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  menuSurfaceShadow: {
    borderRadius: 16,
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
