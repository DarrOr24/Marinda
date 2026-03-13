// components/header-profile-button.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { KidModePickerModal } from '@/components/kid-mode-picker-modal'
import { useFamily } from '@/lib/families/families.hooks'
import { useMember } from '@/lib/members/members.hooks'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MemberAvatar } from '@/components/avatar/member-avatar'


export function HeaderProfileButton() {
  const insets = useSafeAreaInsets()
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

  const [open, setOpen] = useState(false)
  const [kidModePickerOpen, setKidModePickerOpen] = useState(false)
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

  const handleExitKidMode = async () => {
    const didExit = await exitKidMode()
    if (didExit) setOpen(false)
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

  return (
    <>
      <View style={styles.headerRight}>
        {isKidMode && (
          <TouchableOpacity style={styles.kidModeButton} onPress={handleExitKidMode}>
            <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#1d4ed8" />
            <Text style={styles.kidModeButtonText}>Exit kid mode</Text>
          </TouchableOpacity>
        )}

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

      {/* Dropdown Modal */}
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />

          <View style={[styles.menuAnchor, { top: insets.top + 56 }]}>
            <View style={styles.menu}>
              {showParentMenuActions && (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    setOpen(false)
                    router.push('/getting-started')
                  }}
                >
                  <MaterialCommunityIcons name="play-circle-outline" size={20} color="#2563eb" />
                  <Text style={[styles.itemText, { color: '#2563eb' }]}>Get started</Text>
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
                  <MaterialCommunityIcons name="cog-outline" size={20} color="#334155" />
                  <Text style={styles.itemText}>Settings</Text>
                </TouchableOpacity>
              )}

              {showParentMenuActions && (
                <TouchableOpacity style={styles.item} onPress={handleOpenKidModePicker}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#334155" />
                  <Text style={styles.itemText}>Enter kid mode</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.item} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={20} color="#dc2626" />
                <Text style={[styles.itemText, { color: '#dc2626' }]}>
                  Log out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <KidModePickerModal
        visible={kidModePickerOpen}
        members={kidModeCandidates}
        onClose={() => setKidModePickerOpen(false)}
        onSelectMember={handleSelectKidModeMember}
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
  kidModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
  },
  kidModeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  menuAnchor: {
    position: 'absolute',
    right: 10,
    zIndex: 2,
    elevation: 8,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 160,
    paddingVertical: 8,
    elevation: 6,
    zIndex: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  itemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
})
