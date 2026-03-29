import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Platform,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ModalBase } from './modal-base'

type AnchorLayout = { x: number; y: number; width: number; height: number }
type ModalSize = 'menu' | 'menu-wide'
type PopoverPosition = 'bottom-left' | 'bottom-right'

type ModalPopoverProps = {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  closeOnBackdropPress?: boolean
  onShow?: () => void
  anchorRef: React.RefObject<View | null>
  size?: ModalSize
  position?: PopoverPosition
}

const CONTAINER_PADDING = 16
const POPOVER_GAP = 8

const SURFACE_WIDTH: Record<ModalSize, number> = {
  menu: 220,
  'menu-wide': 260,
}

function getPopoverWidth(size: ModalSize, screenWidth: number) {
  return Math.min(SURFACE_WIDTH[size], screenWidth - CONTAINER_PADDING * 2)
}

export function ModalPopover({
  visible,
  onClose,
  children,
  anchorRef,
  size = 'menu',
  position = 'bottom-right',
  closeOnBackdropPress = true,
  onShow,
}: ModalPopoverProps) {
  const insets = useSafeAreaInsets()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const [anchorLayout, setAnchorLayout] = useState<AnchorLayout | null>(null)
  const androidAnchorOffset =
    Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : 0

  const measureAnchor = useCallback(() => {
    const anchorNode = anchorRef.current

    if (!anchorNode) {
      setAnchorLayout(null)
      return
    }

    if (typeof anchorNode.measureInWindow !== 'function') {
      setAnchorLayout(null)
      return
    }

    anchorNode.measureInWindow((x, y, width, height) => {
      setAnchorLayout({ x, y, width, height })
    })
  }, [anchorRef])

  useEffect(() => {
    if (!visible) {
      setAnchorLayout(null)
      return
    }

    const frame = requestAnimationFrame(() => {
      measureAnchor()
    })

    return () => cancelAnimationFrame(frame)
  }, [measureAnchor, screenHeight, screenWidth, visible])

  const anchorTop = anchorLayout
    ? anchorLayout.y + anchorLayout.height + POPOVER_GAP + androidAnchorOffset
    : null
  const paddingTop = Math.max(CONTAINER_PADDING + insets.top, anchorTop ?? 0)
  const paddingBottom = 16 + insets.bottom
  const maxHeight = screenHeight - paddingTop - paddingBottom
  const boundedWidth = getPopoverWidth(size, screenWidth)

  const anchoredContentStyle = useMemo(() => {
    if (!anchorLayout) return null

    if (position === 'bottom-left') {
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
  }, [anchorLayout, position, screenWidth])

  if (!anchorRef.current) {
    return null
  }

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      onShow={() => {
        measureAnchor()
        onShow?.()
      }}
      closeOnBackdropPress={closeOnBackdropPress}
      backdropTone="soft"
      avoidKeyboard={false}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop,
            paddingBottom,
            alignItems: position === 'bottom-left' ? 'flex-start' : 'center',
          },
        ]}
      >
        <View
          style={[
            styles.content,
            position === 'bottom-left' ? styles.contentLeft : styles.contentRight,
            anchoredContentStyle,
            !anchorLayout ? styles.hiddenContent : null,
          ]}
        >
          <View
            style={[
              styles.surface,
              styles.popoverSurfaceShadow,
              {
                minWidth: boundedWidth,
                maxWidth: screenWidth - CONTAINER_PADDING * 2,
              },
            ]}
          >
            <View
              style={[
                styles.surfaceClip,
                styles.popoverSurface,
                {
                  maxHeight,
                },
              ]}
            >
              {children}
            </View>
          </View>
        </View>
      </View>
    </ModalBase>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: CONTAINER_PADDING,
  },
  content: {
    flex: 1,
    width: '100%',
    minHeight: 0,
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
  popoverSurfaceShadow: {
    borderRadius: 16,
  },
  popoverSurface: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
})
