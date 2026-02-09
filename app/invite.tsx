// app/invite.tsx
// Invite deep-link handler only: sync token to auth context when status is still pending.
// All redirects are handled by AuthRouter.
import { useEffect } from 'react'
import { useLocalSearchParams, useRootNavigationState } from 'expo-router'

import { useAuthContext } from '@/hooks/use-auth-context'
import { getInviteStatus } from '@/lib/families/families.api'

export default function InviteScreen() {
  const navState = useRootNavigationState()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const { isLoading, setPendingInviteToken } = useAuthContext()

  useEffect(() => {
    if (!navState?.key || isLoading) return

    if (!token) {
      void setPendingInviteToken(null)
      return
    }

    (async () => {
      try {
        const status = await getInviteStatus(token)
        if (status === 'pending') {
          await setPendingInviteToken(token)
        } else {
          await setPendingInviteToken(null)
        }
      } catch {
        await setPendingInviteToken(null)
      }
    })()
  }, [navState?.key, isLoading, token, setPendingInviteToken])

  return null
}
