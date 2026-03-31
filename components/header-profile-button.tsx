// components/header-profile-button.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { KidModePinModal } from '@/components/kid-mode-pin-modal'
import { KidModePickerModal } from '@/components/kid-mode-picker-modal'
import { useFamily } from '@/lib/families/families.hooks'
import { useMember } from '@/lib/members/members.hooks'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useRef, useState } from 'react'
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import { MemberAvatar } from '@/components/avatar/member-avatar'
import { ThemedText } from '@/components/themed-text'
import { ModalPopover } from '@/components/ui'
import type { FamilyMember } from '@/lib/members/members.types'
import { useTheme } from '@/providers/theme-provider'
import { memberDisplayName } from '@/utils/format.utils'


export function HeaderProfileButton() {
  const theme = useTheme()
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

  const handleLogout = () => {
    Alert.alert('Log out?', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        onPress: async () => {
          try {
            await signOut?.()
          } catch (err: any) {
            Alert.alert('Sign out failed', err?.message)
          }
        },
      },
    ])
  }

  const onPressIcon = () => {
    if (!isLoggedIn) {
      return Alert.alert(
        'Welcome to Marinda 💫',
        'Sign in or create your family account to continue',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log in', onPress: () => router.push('/login') },
          { text: 'Create Account', onPress: () => console.log('create') },
        ]
      )
    }

    setOpen(true)
  }

  const handleOpenKidModePicker = () => {
    setOpen(false)
    if (kidModeCandidates.length === 0) {
      Alert.alert('No kids yet', 'Add a kid or teen first to use kid mode.')
      return
    }
    setKidModePickerOpen(true)
  }

  const handleSelectKidModeMember = async (memberId: string) => {
    setKidModePickerOpen(false)

    if (!authMemberDetails.data?.kid_mode_pin) {
      Alert.alert(
        'Kid mode PIN required',
        'Set up a kid mode PIN in Settings before entering kid mode.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open settings',
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
          <TouchableOpacity onPress={onPressIcon} style={{ marginLeft: 4 }}>
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
        position="bottom-right"
      >
        <View style={styles.menu}>
          {showParentMenuActions && (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                setOpen(false)
                router.push('/getting-started')
              }}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={20} color={theme.info} />
              <ThemedText variant="bodySmall" weight="semibold" tone="info">
                Get started
              </ThemedText>
            </TouchableOpacity>
          )}

          {showParentMenuActions && (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                setOpen(false)
                router.push('/settings')
              }}
            >
              <MaterialCommunityIcons name="cog-outline" size={20} color={theme.textLighter1} />
              <ThemedText variant="bodySmall" weight="semibold">
                Settings
              </ThemedText>
            </TouchableOpacity>
          )}

          {showParentMenuActions && (
            <TouchableOpacity style={styles.item} onPress={handleOpenKidModePicker}>
              <MaterialCommunityIcons name="shield-lock-outline" size={20} color={theme.textLighter1} />
              <ThemedText variant="bodySmall" weight="semibold">
                Enter kid mode
              </ThemedText>
            </TouchableOpacity>
          )}

          {isKidMode && effectiveMember && (
            <>
              <View style={[styles.kidMenuIdentity, { borderBottomColor: theme.borderLight }]}>
                <ThemedText variant="label" tone="muted" style={styles.kidMenuLabel}>
                  Playing as
                </ThemedText>
                <ThemedText variant="headline" numberOfLines={2}>
                  {memberDisplayName(effectiveMember as FamilyMember)}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  setOpen(false)
                  router.push('/settings')
                }}
              >
                <MaterialCommunityIcons name="cog-outline" size={20} color={theme.textLighter1} />
                <ThemedText variant="bodySmall" weight="semibold">
                  Settings
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  void handleExitKidMode()
                }}
              >
                <MaterialCommunityIcons name="shield-lock-outline" size={20} color={theme.info} />
                <ThemedText variant="bodySmall" weight="semibold" tone="info">
                  Exit kid mode
                </ThemedText>
              </TouchableOpacity>
            </>
          )}

          {!isKidMode && (
            <TouchableOpacity style={styles.item} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={20} color={theme.dangerText} />
              <ThemedText variant="bodySmall" weight="semibold" tone="danger">
                Log out
              </ThemedText>
            </TouchableOpacity>
          )}
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
        title="Enter parent PIN"
        message="Enter your 4-digit PIN to switch back to parent mode."
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
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
})
