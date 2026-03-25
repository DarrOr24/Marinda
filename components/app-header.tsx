import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { usePathname } from 'expo-router'
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { BackForwardButton } from '@/components/back-forward-button'
import { HeaderProfileButton } from '@/components/header-profile-button'
import { useAuthContext } from '@/hooks/use-auth-context'

type HeaderIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

type AppHeaderConfig = {
  title?: string
  icon?: HeaderIconName
  color?: string
  hiddenTitle?: boolean
}

type AppHeaderContextValue = {
  setOverride: (config: AppHeaderConfig | null) => void
}

const ROOT_APP_PATHS = ['/profiles', '/chores', '/wishlist', '/boards']

const AppHeaderContext = createContext<AppHeaderContextValue | null>(null)

export function AppHeaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, isKidMode, exitKidMode } = useAuthContext()
  const [override, setOverride] = useState<AppHeaderConfig | null>(null)

  const firstName =
    profile?.first_name ||
    profile?.last_name ||
    'Account'

  const accountTitle = `${firstName}'s Account`

  const defaultConfig = useMemo<AppHeaderConfig>(() => {
    const hiddenTitle = isKidMode

    if (pathname === '/chores') {
      return {
        title: 'Chores',
        icon: 'clipboard-check-outline',
        color: '#7c3aed',
        hiddenTitle,
      }
    }

    if (pathname === '/wishlist') {
      return {
        title: 'Wishlist',
        icon: 'gift-outline',
        color: '#22c55e',
        hiddenTitle,
      }
    }

    if (pathname === '/boards') {
      return {
        title: 'Boards',
        icon: 'view-dashboard-outline',
        color: '#f59e0b',
        hiddenTitle,
      }
    }

    if (pathname === '/profiles') {
      return {
        title: accountTitle,
        hiddenTitle,
      }
    }

    if (pathname.startsWith('/profiles/')) {
      return {
        title: 'Profile',
        hiddenTitle,
      }
    }

    if (pathname === '/getting-started') {
      return {
        title: 'Get started',
        hiddenTitle,
      }
    }

    if (pathname === '/settings') {
      return {
        title: 'Settings',
        hiddenTitle,
      }
    }

    if (pathname === '/settings/account') {
      return {
        title: 'Account Settings',
        hiddenTitle,
      }
    }

    if (pathname === '/settings/email') {
      return {
        title: 'Email Settings',
        hiddenTitle,
      }
    }

    if (pathname === '/settings/member') {
      return {
        title: 'My Family Member Settings',
        hiddenTitle,
      }
    }

    if (pathname === '/settings/family') {
      return {
        title: 'Family Settings',
        hiddenTitle,
      }
    }

    if (pathname === '/settings/kid-mode-pin') {
      return {
        title: 'Kid Mode PIN',
        hiddenTitle,
      }
    }

    if (pathname === '/settings/add-member') {
      return {
        title: 'Add Member',
        hiddenTitle,
      }
    }

    if (pathname === '/settings/add-member/sms-invite') {
      return {
        title: 'Invite by SMS',
        hiddenTitle,
      }
    }

    if (pathname === '/settings/add-member/add-kid') {
      return {
        title: 'Add kid (no phone)',
        hiddenTitle,
      }
    }

    if (pathname === '/settings/billing') {
      return {
        title: 'Billing Settings',
        hiddenTitle,
      }
    }

    if (pathname === '/chores/info') {
      return {
        title: 'How chore game works',
        icon: 'clipboard-check-outline',
        color: '#7c3aed',
        hiddenTitle,
      }
    }

    if (pathname === '/chores/settings') {
      return {
        title: 'Chore Game Settings',
        icon: 'clipboard-check-outline',
        color: '#7c3aed',
        hiddenTitle,
      }
    }

    if (pathname === '/wishlist/info') {
      return {
        title: 'How Wishlist Works',
        icon: 'gift-outline',
        color: '#db2777',
        hiddenTitle,
      }
    }

    if (pathname === '/wishlist/settings') {
      return {
        title: 'Wishlist Settings',
        icon: 'gift-outline',
        color: '#db2777',
        hiddenTitle,
      }
    }

    if (pathname === '/announcements/info') {
      return {
        title: 'How announcements work',
        icon: 'bullhorn-outline',
        color: '#f59e0b',
        hiddenTitle,
      }
    }

    if (pathname === '/announcements/settings') {
      return {
        title: 'Announcements Settings',
        icon: 'bullhorn-outline',
        color: '#f59e0b',
        hiddenTitle,
      }
    }

    return {
      title: '',
      hiddenTitle,
    }
  }, [accountTitle, isKidMode, pathname])

  const value = useMemo<AppHeaderContextValue>(
    () => ({
      setOverride,
    }),
    [],
  )

  const config = {
    ...defaultConfig,
    ...override,
    hiddenTitle: override?.hiddenTitle ?? defaultConfig.hiddenTitle,
  }

  const showBackButton = !ROOT_APP_PATHS.includes(pathname)

  return (
    <AppHeaderContext.Provider value={value}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View
            style={[
              styles.leftSlot,
              !isKidMode && styles.leftSlotFixedWidth,
              isKidMode && styles.leftSlotKidMode,
            ]}
          >
            {showBackButton ? <BackForwardButton direction="back" size="sm" /> : null}
            {isKidMode && (
              <TouchableOpacity
                style={styles.exitKidModeButton}
                onPress={() => exitKidMode?.()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Exit kid mode"
              >
                <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#1d4ed8" />
                <Text style={styles.exitKidModeButtonText} numberOfLines={1}>
                  Exit kid mode
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!config.hiddenTitle && (
            <View style={styles.centerSlot} pointerEvents="none">
              {config.icon ? (
                <View style={styles.titleRow}>
                  <MaterialCommunityIcons
                    name={config.icon}
                    size={22}
                    color={config.color ?? '#0f172a'}
                    style={styles.titleIcon}
                  />
                  <Text
                    style={[styles.title, styles.titleInRow, { color: config.color ?? '#0f172a' }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    textAlign="center"
                  >
                    {config.title}
                  </Text>
                </View>
              ) : (
                <Text
                  style={styles.title}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  textAlign="center"
                >
                  {config.title}
                </Text>
              )}
            </View>
          )}

          <View style={styles.rightSlot}>
            <HeaderProfileButton />
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.content}>{children}</View>
    </AppHeaderContext.Provider>
  )
}

export function useAppHeader(config: AppHeaderConfig | null) {
  const context = useContext(AppHeaderContext)

  if (!context) {
    throw new Error('useAppHeader must be used within AppHeaderProvider')
  }

  const title = config?.title
  const icon = config?.icon
  const color = config?.color
  const hiddenTitle = config?.hiddenTitle

  useFocusEffect(
    useCallback(() => {
      context.setOverride(config)

      return () => {
        context.setOverride(null)
      }
    }, [color, context, hiddenTitle, icon, title]),
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  header: {
    minHeight: 60,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  leftSlot: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  /** Balances the header when not in kid mode (matches right avatar tap area). */
  leftSlotFixedWidth: {
    width: 56,
  },
  leftSlotKidMode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  exitKidModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    flexShrink: 0,
  },
  exitKidModeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
    flexShrink: 0,
  },
  centerSlot: {
    position: 'absolute',
    left: 72,
    right: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSlot: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    justifyContent: 'center',
  },
  titleIcon: {
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 24,
  },
  /** Icon + title row: title may shrink/wrap so long names work with large accessibility font sizes. */
  titleInRow: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  content: {
    flex: 1,
  },
})
