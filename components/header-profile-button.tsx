// components/header-profile-button.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { KidModePinModal } from '@/components/kid-mode-pin-modal'
import { KidModePickerModal } from '@/components/kid-mode-picker-modal'
import { useFamily } from '@/lib/families/families.hooks'
import { useMember } from '@/lib/members/members.hooks'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import { MemberAvatar } from '@/components/avatar/member-avatar'
import { ThemedText } from '@/components/themed-text'
import { ModalPopover } from '@/components/ui'
import { useRtlStyles } from '@/hooks/use-rtl-styles'
import type { FamilyMember } from '@/lib/members/members.types'
import { useTheme } from '@/providers/theme-provider'
import { memberDisplayName } from '@/utils/format.utils'


export function HeaderProfileButton() {
  const theme = useTheme()
  const { t } = useTranslation()
  const r = useRtlStyles()
  const {
    isLoggedIn,
    signOut,
    activeFamilyId,
    authMember,
    effectiveMember,
    isKidMode,
    enterKidMode,
    exitKidMode,
    hasParentPermissions,
  } = useAuthContext()
  const { familyMembers } = useFamily(activeFamilyId)
  const authMemberDetails = useMember(authMember?.id ?? null)
  const menuAnchorRef = useRef<View>(null)

  const [open, setOpen] = useState(false)
  const [kidModePickerOpen, setKidModePickerOpen] = useState(false)
  const [kidModePinOpen, setKidModePinOpen] = useState(false)
  const kidModeCandidates = (familyMembers.data ?? []).filter(
    member => member.role === 'CHILD' || member.role === 'TEEN',
  )
  const showParentMenuActions =
    !!authMember &&
    !!effectiveMember &&
    authMember.id === effectiveMember.id &&
    hasParentPermissions &&
    !isKidMode
  const showSettingsAction = !!effectiveMember

  const handleLogout = () => {
    Alert.alert(t('navigation.profileMenu.logOutTitle'), t('navigation.profileMenu.logOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('navigation.profileMenu.logOut'),
        onPress: async () => {
          try {
            await signOut?.()
          } catch (err: any) {
            Alert.alert(t('navigation.profileMenu.signOutFailed'), err?.message)
          }
        },
      },
    ])
  }

  const onPressIcon = () => {
    if (!isLoggedIn) {
      return Alert.alert(
        t('navigation.profileMenu.welcomeTitle'),
        t('navigation.profileMenu.welcomeMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('navigation.profileMenu.logIn'), onPress: () => router.push('/login') },
          { text: t('navigation.profileMenu.createAccount'), onPress: () => console.log('create') },
        ]
      )
    }

    setOpen(true)
  }

  const handleOpenKidModePicker = () => {
    setOpen(false)
    if (kidModeCandidates.length === 0) {
      Alert.alert(t('navigation.profileMenu.noKidsTitle'), t('navigation.profileMenu.noKidsMessage'))
      return
    }
    setKidModePickerOpen(true)
  }

  const handleSelectKidModeMember = async (memberId: string) => {
    setKidModePickerOpen(false)

    if (!authMemberDetails.data?.kid_mode_pin) {
      Alert.alert(
        t('navigation.profileMenu.kidModePinRequiredTitle'),
        t('navigation.profileMenu.kidModePinRequiredMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('navigation.profileMenu.openSettings'),
            onPress: () => router.push('/settings/kid-mode-pin'),
          },
        ],
      )
      return
    }

    await enterKidMode(memberId)
  }

  const handleExitKidMode = async () => {
    setOpen(false)

    if (authMember?.kid_mode_pin) {
      setKidModePinOpen(true)
      return
    }

    await exitKidMode()
  }

  const handleSubmitKidModePin = async (pin: string) => {
    const didExitKidMode = await exitKidMode(pin)

    if (didExitKidMode) {
      setKidModePinOpen(false)
    }
  }

  return (
    <>
      <View style={styles.headerRight}>
        <View ref={menuAnchorRef} collapsable={false}>
          <TouchableOpacity onPress={onPressIcon} style={r.marginStart(4)}>
            {effectiveMember?.id && (
              <MemberAvatar
                memberId={effectiveMember.id}
                size="md"
                isUpdatable={false}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Modal */}
      <ModalPopover
        visible={open}
        onClose={() => setOpen(false)}
        anchorRef={menuAnchorRef}
        position={r.rtl ? 'bottom-left' : 'bottom-right'}
      >
        <View style={styles.menu}>
          {showParentMenuActions && (
            <TouchableOpacity
              style={[styles.item, r.row]}
              onPress={() => {
                setOpen(false)
                router.push('/getting-started')
              }}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={20} color={theme.info} />
              <ThemedText
                variant="bodySmall"
                weight="semibold"
                tone="info"
                style={[styles.menuItemText, r.textAlignStart, r.writingDirection]}
              >
                {t('navigation.profileMenu.getStarted')}
              </ThemedText>
            </TouchableOpacity>
          )}

          {showSettingsAction && !isKidMode && (
            <TouchableOpacity
              style={[styles.item, r.row]}
              onPress={() => {
                setOpen(false)
                router.push('/settings')
              }}
            >
              <MaterialCommunityIcons name="cog-outline" size={20} color={theme.textLighter1} />
              <ThemedText
                variant="bodySmall"
                weight="semibold"
                style={[styles.menuItemText, r.textAlignStart, r.writingDirection]}
              >
                {t('navigation.profileMenu.settings')}
              </ThemedText>
            </TouchableOpacity>
          )}

          {showParentMenuActions && (
            <TouchableOpacity style={[styles.item, r.row]} onPress={handleOpenKidModePicker}>
              <MaterialCommunityIcons name="shield-lock-outline" size={20} color={theme.textLighter1} />
              <ThemedText
                variant="bodySmall"
                weight="semibold"
                style={[styles.menuItemText, r.textAlignStart, r.writingDirection]}
              >
                {t('navigation.profileMenu.enterKidMode')}
              </ThemedText>
            </TouchableOpacity>
          )}

          {isKidMode && effectiveMember && (
            <>
              <View style={[styles.kidMenuIdentity, { borderBottomColor: theme.borderLight }]}>
                <ThemedText
                  variant="label"
                  tone="muted"
                  style={[styles.kidMenuLabel, r.textAlignStart, r.writingDirection]}
                >
                  {t('navigation.profileMenu.playingAs')}
                </ThemedText>
                <ThemedText
                  variant="headline"
                  numberOfLines={2}
                  style={[r.textAlignStart, r.writingDirection]}
                >
                  {memberDisplayName(effectiveMember as FamilyMember)}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={[styles.item, r.row]}
                onPress={() => {
                  setOpen(false)
                  router.push('/settings')
                }}
              >
                <MaterialCommunityIcons name="cog-outline" size={20} color={theme.textLighter1} />
                <ThemedText
                  variant="bodySmall"
                  weight="semibold"
                  style={[styles.menuItemText, r.textAlignStart, r.writingDirection]}
                >
                  {t('navigation.profileMenu.settings')}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.item, r.row]}
                onPress={() => {
                  void handleExitKidMode()
                }}
              >
                <MaterialCommunityIcons name="shield-lock-outline" size={20} color={theme.info} />
                <ThemedText
                  variant="bodySmall"
                  weight="semibold"
                  tone="info"
                  style={[styles.menuItemText, r.textAlignStart, r.writingDirection]}
                >
                  {t('navigation.profileMenu.exitKidMode')}
                </ThemedText>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={[styles.item, r.row]} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color={theme.dangerText} />
            <ThemedText
              variant="bodySmall"
              weight="semibold"
              tone="danger"
              style={[styles.menuItemText, r.textAlignStart, r.writingDirection]}
            >
              {t('navigation.profileMenu.logOut')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ModalPopover>

      <KidModePickerModal
        visible={kidModePickerOpen}
        members={kidModeCandidates}
        onClose={() => setKidModePickerOpen(false)}
        onSelectMember={handleSelectKidModeMember}
      />

      <KidModePinModal
        visible={kidModePinOpen}
        title={t('navigation.profileMenu.enterParentPinTitle')}
        message={t('navigation.profileMenu.enterParentPinMessage')}
        onCancel={() => setKidModePinOpen(false)}
        onSubmit={handleSubmitKidModePin}
      />
    </>
  )
}


const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kidMenuIdentity: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kidMenuLabel: {
    marginBottom: 4,
  },
  menu: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuItemText: {
    flex: 1,
    minWidth: 0,
  },
})
