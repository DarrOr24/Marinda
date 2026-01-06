// components/auth-router.tsx
import { usePathname, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import { FamilyMember } from '@/lib/members/members.types'
import { useProfile } from '@/lib/profiles/profiles.hooks'
import { type Profile } from '@/lib/profiles/profiles.types'
import { isKidRole } from '@/utils/validation.utils'

const ENTRY_ROUTES = [
  '/',
  '/login',
  '/onboarding/create-or-join',
  '/onboarding/details',
  '/select-family',
]

function CenterLoader() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  )
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
    member,
  } = useAuthContext()

  const profile = useProfile(profileId)
  const { familyMembers } = useFamily(activeFamilyId ?? undefined)

  const isEntryRoute = ENTRY_ROUTES.includes(pathname)

  const shouldBlock =
    isLoading ||
    (isLoggedIn && profile.isLoading) ||
    (isLoggedIn && !memberships) ||
    (isLoggedIn && memberships && memberships.length > 1 && !activeFamilyId) ||
    (isLoggedIn && activeFamilyId && !member) ||
    (activeFamilyId && familyMembers.isLoading)

  useEffect(() => {
    if (isLoading) return

    // Not logged in -> let the app show login / public routes
    if (!isLoggedIn) return

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

    // 3) Has families but no active -> select family (only if more than 1)
    if (!activeFamilyId) {
      if (memberships.length > 1 && pathname !== '/select-family') {
        router.replace('/select-family')
      }
      return
    }

    // 4) Active family set but member not loaded yet -> wait
    if (!member) return

    // 5) If not on an entry route, don't redirect
    if (!isEntryRoute) return

    // 6) Redirect into app home (kid handling)
    const isKid = isKidRole(member.role)

    if (isKid) {
      const firstKid = familyMembers.data?.find((m: FamilyMember) => isKidRole(m.role))
      const targetId = firstKid ? firstKid.id : member.id
      router.replace(`/profile/${targetId}`)
    } else {
      router.replace(`/profile/${member.id}`)
    }
  }, [
    isLoading,
    isLoggedIn,
    memberships,
    activeFamilyId,
    member,
    pathname,
    router,
    profile.isLoading,
    profile.data,
    familyMembers.data,
  ])

  return shouldBlock ? <CenterLoader /> : null
}
