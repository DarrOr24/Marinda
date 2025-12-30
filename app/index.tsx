// app/index.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import { Member } from '@/lib/families/families.types'
import { isKidRole } from '@/utils/validation.utils'
import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'


function CenterLoader() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  )
}

export default function AppIndexGateway() {
  const {
    isLoggedIn,
    isLoading,
    memberships,
    activeFamilyId,
    member,
  } = useAuthContext()

  // Not logged in → go to login
  if (!isLoggedIn) return <Redirect href="/login" />

  // Wait for auth provider to finish fetching session/memberships
  if (isLoading || !memberships) return <CenterLoader />

  // No families → onboarding
  if (memberships.length === 0) return <Redirect href="/onboarding" />

  // Has families but none selected → select-family
  if (!activeFamilyId) return <Redirect href="/select-family" />

  // We have a family selected; wait for member
  if (!member) return <CenterLoader />

  // Now decide the true "home" screen
  if (isKidRole(member.role)) return <Redirect href={`/profile/${member.id}`} />

  // Parent → first kid if exists
  const { familyMembers } = useFamily(activeFamilyId)
  const firstKid = familyMembers.data?.find(
    (m: Member) => isKidRole(m.role),
  )

  const targetId = firstKid?.id || member.id
  return <Redirect href={`/profile/${targetId}`} />
}
