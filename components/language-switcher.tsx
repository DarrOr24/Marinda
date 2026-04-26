// components/language-switcher.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { useRtlStyles } from '@/hooks/use-rtl-styles'
import {
  persistLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLangCode,
} from '@/lib/i18n'
import { useTheme } from '@/providers/theme-provider'

const LANG_MAP = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l]),
) as Record<SupportedLangCode, (typeof SUPPORTED_LANGUAGES)[number]>

type LanguageSwitcherProps = {
  visible?: boolean
  onClose?: () => void
}

export function LanguageSwitcher({ visible: visibleProp, onClose: onCloseProp }: LanguageSwitcherProps = {}) {
  const { i18n } = useTranslation()
  const theme = useTheme()
  const r = useRtlStyles()
  const current = (i18n.language?.split('-')[0] ?? 'he') as SupportedLangCode
  const [value, setValue] = useState<SupportedLangCode | null>(current)
  const isChanging = useRef(false)
  const [internalVisible, setInternalVisible] = useState(false)

  const isControlled = visibleProp !== undefined && onCloseProp !== undefined
  const visible = isControlled ? visibleProp! : internalVisible
  const onClose = isControlled ? onCloseProp! : () => setInternalVisible(false)

  useEffect(() => {
    const code = (i18n.language?.split('-')[0] ?? 'he') as SupportedLangCode
    setValue((prev) => (prev === code ? prev : code))
  }, [i18n.language])

  const handleSelect = async (v: SupportedLangCode) => {
    if (v === i18n.language?.split('-')[0] || isChanging.current) {
      onClose()
      return
    }
    isChanging.current = true
    onClose()

    try {
      setValue(v)
      await persistLanguage(v)
      await i18n.changeLanguage(v)
    } finally {
      isChanging.current = false
    }
  }

  const lang = LANG_MAP[current]
  const flag = lang?.flag ?? '🌐'

  return (
    <>
      {!isControlled && (
        <Pressable
          style={({ pressed }) => [
            styles.trigger,
            {
              backgroundColor: theme.surface,
              borderColor: theme.borderLight,
            },
            r.row,
            r.alignSelfStart,
            pressed && styles.triggerPressed,
          ]}
          onPress={() => setInternalVisible(true)}
          accessibilityLabel={i18n.t('common.changeLanguage')}
        >
          <View style={[styles.globeSection, { backgroundColor: theme.primarySoft }]}>
            <MaterialCommunityIcons name="translate" size={18} color={theme.primaryBackground} />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
          <View style={[styles.flagSection, r.row]}>
            <ThemedText variant="bodySmall" weight="semibold">
              {i18n.t('common.language')}
            </ThemedText>
            <ThemedText style={styles.flag}>{flag}</ThemedText>
            <MaterialCommunityIcons name="chevron-down" size={18} color={theme.textLighter2} />
          </View>
        </Pressable>
      )}

      {visible && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={onClose}
        >
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
            onPress={onClose}
          >
            <Pressable>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.borderLight,
                    shadowColor: theme.shadow,
                  },
                ]}
              >
                <View style={[r.row, styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
                  <View style={styles.modalTitleBlock}>
                    <ThemedText variant="headline">Language</ThemedText>
                    <ThemedText variant="bodySmall" tone="muted">
                      Choose how Marinda appears on this device.
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={onClose}
                    hitSlop={12}
                    style={[
                      styles.closeArea,
                      { backgroundColor: theme.surfaceMuted, borderColor: theme.borderLight },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color={theme.textLighter2}
                    />
                  </Pressable>
                </View>
                <View style={styles.optionsList}>
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = value === lang.code

                    return (
                      <Pressable
                        key={lang.code}
                        style={({ pressed }) => [
                          r.row,
                          styles.option,
                          {
                            backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                            borderColor: isSelected ? theme.primaryBorder : theme.borderLight,
                          },
                          pressed && styles.optionPressed,
                        ]}
                        onPress={() => handleSelect(lang.code)}
                      >
                        <View style={[r.row, styles.optionFlagGroup]}>
                          <View
                            style={[
                              styles.optionFlagWrap,
                              {
                                backgroundColor: isSelected ? theme.primaryBackground : theme.surfaceMuted,
                              },
                            ]}
                          >
                            <ThemedText style={styles.optionFlag}>{lang.flag}</ThemedText>
                          </View>
                          <View style={styles.optionTextBlock}>
                            <ThemedText variant="body" weight="semibold">
                              {lang.nativeLabel}
                            </ThemedText>
                            <ThemedText variant="bodySmall" tone="muted">
                              {lang.label}
                            </ThemedText>
                          </View>
                        </View>
                        {isSelected ? (
                          <View
                            style={[
                              styles.checkBadge,
                              { backgroundColor: theme.primaryBackground },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="check"
                              size={16}
                              color={theme.primaryText}
                            />
                          </View>
                        ) : (
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={18}
                            color={theme.textLighter2}
                            style={r.rtl ? styles.chevronRtl : undefined}
                          />
                        )}
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    width: "100%",
    maxWidth: 340,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  modalHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitleBlock: {
    flex: 1,
    gap: 2,
  },
  closeArea: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    padding: 14,
    gap: 10,
  },
  option: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionFlagGroup: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  optionFlagWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionFlag: {
    fontSize: 22,
  },
  optionTextBlock: {
    flex: 1,
    gap: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trigger: {
    alignItems: "stretch",
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  triggerPressed: { opacity: 0.8 },
  globeSection: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: { width: 1, alignSelf: "stretch" },
  flagSection: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  flag: { fontSize: 18 },
  chevronRtl: {
    transform: [{ rotate: '180deg' }],
  },
})
