// components/auth-router.tsx
import { usePathname, useRouter } from 'expo-router'
import { useEffect } from 'react'

import { useAuthContext } from '@/hooks/use-auth-context'
import { useProfile } from '@/lib/profiles/profiles.hooks'
import { type Profile } from '@/lib/profiles/profiles.types'

const ENTRY_ROUTES = [
  '/',
  '/login',
  '/invite',
  '/onboarding/create-or-join',
  '/onboarding/details',
  '/onboarding/accept-invite',
  '/onboarding/select-family',
]

const KID_MODE_BLOCKED_ROUTES = [
  '/chores/settings',
  '/wishlist/settings',
  '/announcements/settings',
  '/shopping/settings',
  '/lists/settings',
  '/getting-started',
]

function isKidModeBlockedSettingsRoute(pathname: string) {
  return pathname.startsWith('/settings/') && pathname !== '/settings/member'
}

function isKidModeBlockedRoute(pathname: string) {
  return isKidModeBlockedSettingsRoute(pathname) || KID_MODE_BLOCKED_ROUTES.includes(pathname)
}

function isProfileComplete(p: Profile | undefined) {
  if (!p) return false
  return !!(p.first_name?.trim() && p.last_name?.trim())
}

export function AuthRouter() {
  const router = useRouter()
  const pathname = usePathname()

  const {
    isLoggedIn,
    isLoading,
    profileId,
    memberships,
    activeFamilyId,
    effectiveMember,
    isKidMode,
    pendingInviteToken,
  } = useAuthContext()

  const profile = useProfile(profileId)
  const isEntryRoute = ENTRY_ROUTES.includes(pathname)

  useEffect(() => {
    if (isLoading) return

    // Not logged in: keep only the login screen reachable.
    if (!isLoggedIn) {
      if (pathname !== '/login') {
        router.replace('/login')
      }
      return
    }

    // Logged in with a pending invite -> onboarding accept-invite step
    if (pendingInviteToken) {
      if (pathname !== '/onboarding/accept-invite') {
        router.replace('/onboarding/accept-invite')
      }
      return
    }

    // Wait until memberships loaded
    if (!memberships) return

    // Wait until profile loaded
    if (profile.isLoading) return

    const profileData = profile.data
    const complete = isProfileComplete(profileData)

    // 1) Profile not complete -> details (always, even if they somehow deep-linked elsewhere)
    // If profile incomplete -> force details
    if (!complete) {
      if (pathname !== '/onboarding/details') router.replace('/onboarding/details')
      return
    }

    // If profile complete BUT user is on details, allow it (editing)
    if (pathname === '/onboarding/details') {
      return
    }

    // 2) No families -> allow onboarding routes (hub/create/join), otherwise force hub
    if (memberships.length === 0) {
      const allowed =
        pathname === '/onboarding/create-or-join' ||
        pathname === '/onboarding/create' ||
        pathname === '/onboarding/join'

      if (!allowed) router.replace('/onboarding/create-or-join')
      return
    }

    // 3) Has families but no active -> select family (only if more than 1); allow create/join so they can add another family
    if (!activeFamilyId) {
      const onSelectFamily = pathname === '/onboarding/select-family'
      const onCreateOrJoin =
        pathname === '/onboarding/create-or-join' ||
        pathname === '/onboarding/create' ||
        pathname === '/onboarding/join'
      if (memberships.length > 1 && !onSelectFamily && !onCreateOrJoin) {
        router.replace('/onboarding/select-family')
      }
      return
    }

    // 4) Active family set but effective member not loaded yet -> wait
    if (!effectiveMember) return

    if (isKidMode && isKidModeBlockedRoute(pathname)) {
      if (isKidModeBlockedSettingsRoute(pathname)) {
        router.replace('/settings/member')
        return
      }

      router.replace('/profiles')
      return
    }

    // 5) If not on an entry route, don't redirect
    if (!isEntryRoute) return

    router.replace('/profiles')
  }, [
    isLoading,
    isLoggedIn,
    memberships,
    activeFamilyId,
    effectiveMember,
    isKidMode,
    pathname,
    pendingInviteToken,
    router,
    profile.isLoading,
    profile.data,
  ])

  return null
}
