import { Alert } from 'react-native'
import { useCallback } from 'react'

import { useAuthContext } from '@/hooks/use-auth-context'

type UseParentPermissionGuardOptions = {
  message?: string
  title?: string
}

export function useParentPermissionGuard(options: UseParentPermissionGuardOptions = {}) {
  const { hasParentPermissions } = useAuthContext()
  const {
    title = 'Parents only',
    message = 'Only parents can do this.',
  } = options

  const requireParent = useCallback(() => {
    if (hasParentPermissions) return true

    Alert.alert(title, message)
    return false
  }, [hasParentPermissions, title, message])

  return {
    hasParentPermissions,
    requireParent,
  }
}
