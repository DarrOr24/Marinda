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
import { Image, Platform, StyleSheet, Text, View } from 'react-native'

import { BackForwardButton } from '@/components/back-forward-button'
import { HeaderProfileButton } from '@/components/header-profile-button'

type HeaderIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

type AppHeaderConfig = {
  title?: string
  icon?: HeaderIconName
  /** Show Marinda title with the app mark (profile routes, or per-screen override). */
  appBrand?: boolean
  color?: string
  hiddenTitle?: boolean
}

type AppHeaderContextValue = {
  setOverride: (config: AppHeaderConfig | null) => void
}

const ROOT_APP_PATHS = ['/profiles', '/chores', '/wishlist', '/boards']

/** Header “Marinda” wordmark — blue tuned to sit with the app icon. */
const APP_BRAND_TITLE_COLOR = '#1570dc'

/** Rounded, friendly face from `@expo-google-fonts/fredoka` (loaded in `providers`). */
const BRAND_TITLE_FONT = 'Fredoka_700Bold'

const AppHeaderContext = createContext<AppHeaderContextValue | null>(null)

export function AppHeaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [override, setOverride] = useState<AppHeaderConfig | null>(null)

  const defaultConfig = useMemo<AppHeaderConfig>(() => {
    /** Kid mode uses the same per-route titles as parents (Chores, Wishes, Boards, …). */
    const hiddenTitle = false

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
        title: 'Wishes',
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

    if (pathname === '/profiles' || pathname.startsWith('/profiles/')) {
      return {
        title: 'Marinda',
        appBrand: true,
        hiddenTitle: false,
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
        title: 'Chores info',
        icon: 'clipboard-check-outline',
        color: '#7c3aed',
        hiddenTitle,
      }
    }

    if (pathname === '/chores/settings') {
      return {
        title: 'Chores settings',
        icon: 'clipboard-check-outline',
        color: '#7c3aed',
        hiddenTitle,
      }
    }

    if (pathname === '/wishlist/info') {
      return {
        title: 'Wishes info',
        icon: 'gift-outline',
        color: '#22c55e',
        hiddenTitle,
      }
    }

    if (pathname === '/wishlist/settings') {
      return {
        title: 'Wishes settings',
        icon: 'gift-outline',
        color: '#22c55e',
        hiddenTitle,
      }
    }

    if (pathname === '/announcements/info') {
      return {
        title: 'Bulletin info',
        icon: 'bullhorn-outline',
        color: '#f59e0b',
        hiddenTitle,
      }
    }

    if (pathname === '/announcements/settings') {
      return {
        title: 'Bulletin settings',
        icon: 'bullhorn-outline',
        color: '#f59e0b',
        hiddenTitle,
      }
    }

    return {
      title: '',
      hiddenTitle,
    }
  }, [pathname])

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
    appBrand: override?.appBrand ?? defaultConfig.appBrand,
  }

  const showBackButton = !ROOT_APP_PATHS.includes(pathname)

  return (
    <AppHeaderContext.Provider value={value}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerBalancedRow}>
            <View style={styles.headerSide}>
              {showBackButton ? <BackForwardButton direction="back" size="sm" /> : null}
            </View>

            <View style={[styles.headerSide, styles.headerSideEnd]}>
              <HeaderProfileButton />
            </View>
          </View>

          {!config.hiddenTitle && (
            <View
              style={[
                styles.headerTitleLayer,
                config.appBrand && [
                  styles.headerTitleLayerBrand,
                  { paddingLeft: showBackButton ? 48 : 16 },
                ],
              ]}
              pointerEvents="none"
            >
              {config.appBrand ? (
                <View style={[styles.titleRow, styles.titleRowBrand]}>
                  <Image
                    source={require('../assets/images/app-icon.png')}
                    style={styles.titleAppIcon}
                  />
                  <Text
                    style={[
                      styles.titleBrandText,
                      styles.titleBrand,
                      styles.titleInRowBrand,
                    ]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {config.title}
                  </Text>
                </View>
              ) : config.icon ? (
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
                  >
                    {config.title}
                  </Text>
                </View>
              ) : (
                <Text
                  style={[styles.title, styles.titlePlain]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {config.title}
                </Text>
              )}
            </View>
          )}
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
  const appBrand = config?.appBrand
  const color = config?.color
  const hiddenTitle = config?.hiddenTitle

  useFocusEffect(
    useCallback(() => {
      context.setOverride(config)

      return () => {
        context.setOverride(null)
      }
    }, [appBrand, color, context, hiddenTitle, icon, title]),
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
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  /** Equal-width columns so back/avatar sit in mirrored slots; title is centered on screen in `headerTitleLayer`. */
  headerBalancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  headerSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  headerSideEnd: {
    justifyContent: 'flex-end',
  },
  headerTitleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleLayerBrand: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '82%',
    justifyContent: 'center',
  },
  titleRowBrand: {
    maxWidth: '78%',
    justifyContent: 'flex-start',
  },
  titleIcon: {
    flexShrink: 0,
  },
  titleAppIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 24,
  },
  /**
   * Brand line uses a single Bold TTF — do not stack `fontWeight: '700'` (Android falls back to system font).
   */
  titleBrandText: {
    fontSize: 20,
    lineHeight: Platform.OS === 'android' ? 26 : 24,
    fontWeight: 'normal',
  },
  titleBrand: {
    color: APP_BRAND_TITLE_COLOR,
    fontFamily: BRAND_TITLE_FONT,
    letterSpacing: -0.3,
  },
  titlePlain: {
    maxWidth: '82%',
    alignSelf: 'center',
    textAlign: 'center',
  },
  /** Icon + title row: shrink/wrap for long titles without stretching across the full header (keeps the block visually centered). */
  titleInRow: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'center',
  },
  titleInRowBrand: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'left',
  },
  content: {
    flex: 1,
  },
})
