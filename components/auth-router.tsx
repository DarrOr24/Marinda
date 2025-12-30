// components/auth-router.tsx
import { usePathname, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import { Member } from '@/lib/families/families.types'
import { isKidRole } from '@/utils/validation.utils'


const ENTRY_ROUTES = ['/', '/login', '/onboarding', '/select-family']

function CenterLoader() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  )
}

export function AuthRouter() {
  const router = useRouter()
  const pathname = usePathname()

  const {
    isLoggedIn,
    isLoading,
    memberships,
    activeFamilyId,
    member,
  } = useAuthContext()

  const { familyMembers } = useFamily(activeFamilyId ?? undefined)

  const isEntryRoute = ENTRY_ROUTES.includes(pathname)

  const shouldBlock =
    isLoading ||
    (isLoggedIn && !memberships) ||
    (isLoggedIn && memberships && memberships.length > 1 && !activeFamilyId) ||
    (isLoggedIn && activeFamilyId && !member) ||
    (activeFamilyId && familyMembers.isLoading)

  useEffect(() => {
    if (isLoading) return
    if (!isLoggedIn) return
    if (!memberships) return

    // No families -> onboarding
    if (memberships.length === 0) {
      router.replace('/onboarding')
      return
    }

    // Has families but no active -> select family
    if (!activeFamilyId) {
      if (memberships.length === 1) return
      router.replace('/select-family')
      return
    }

    // Active family set but member not loaded yet -> wait
    if (!member) return

    // If the pathname is not an entry route don't redirect
    if (!isEntryRoute) return

    // Parent → first kid if exists
    const isKid = isKidRole(member.role)

    if (isKid) {
      const firstKid = familyMembers.data?.find(
        (m: Member) => isKidRole(m.role),
      )
      const targetId = firstKid ? firstKid.id : member.id
      router.replace(`/profile/${targetId}`)
    } else {
      router.replace(`/profile/${member.id}`)
    }
  }, [isLoading, isLoggedIn, memberships, activeFamilyId, member, pathname, router])

  return shouldBlock ? <CenterLoader /> : null
}
