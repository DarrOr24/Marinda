// components/auth-router.tsx
import { usePathname, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import { Member } from '@/lib/families/families.types'
import { isKidRole } from '@/utils/validation.utils'


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

  const { familyMembers } = useFamily(activeFamilyId as string)

  const shouldBlock =
    isLoading ||
    (isLoggedIn && !memberships) ||
    (isLoggedIn && memberships && memberships.length > 0 && !activeFamilyId) ||
    (isLoggedIn && activeFamilyId && !member) ||
    (activeFamilyId && familyMembers.isLoading)

  useEffect(() => {
    if (isLoading) return

    // logged out: let your Stack.Protected show /login
    if (!isLoggedIn) return

    if (!memberships) return

    // No families -> onboarding
    if (memberships.length === 0) {
      router.replace('/onboarding')
      return
    }

    // Has families but no active -> select family
    if (!activeFamilyId) {
      router.replace('/select-family')
      return
    }

    // Active family set but member not loaded yet -> wait
    if (!member) return

    // Parent → first kid if exists
    const firstKid = familyMembers.data?.find(
      (m: Member) => isKidRole(m.role),
    )
    const targetId = firstKid?.id || member.id
    router.replace(`/profile/${targetId}`)
  }, [isLoading, isLoggedIn, memberships, activeFamilyId, member, pathname, router])

  return shouldBlock ? <CenterLoader /> : null
}
