import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { Membership } from '@/lib/families/families.types'
import { fetchActiveMemberIdsForProfile } from '@/lib/members/members.api'
import {
  configureForegroundNotifications,
  registerForPushNotificationsAsync,
} from '@/lib/notifications/push-notifications.service'

import {
  deactivatePushTokensForMembers,
  upsertPushTokens,
} from './push-tokens.api'

type UsePushTokenSyncParams = {
  profileId: string | null
  memberships: Membership[] | null
  authMemberId: string | null
  effectiveMemberId: string | null
  isKidMode: boolean
}

function getTargetMemberIds({
  baseMemberIds,
  authMemberId,
  effectiveMemberId,
  isKidMode,
}: {
  baseMemberIds: string[]
  authMemberId: string | null
  effectiveMemberId: string | null
  isKidMode: boolean
}) {
  if (!isKidMode || !effectiveMemberId) return baseMemberIds

  const withoutAuthMember = authMemberId
    ? baseMemberIds.filter(memberId => memberId !== authMemberId)
    : [...baseMemberIds]

  if (withoutAuthMember.includes(effectiveMemberId)) {
    return withoutAuthMember
  }

  return [...withoutAuthMember, effectiveMemberId]
}

export function usePushTokenSync({
  profileId,
  memberships,
  authMemberId,
  effectiveMemberId,
  isKidMode,
}: UsePushTokenSyncParams) {
  const syncedTokenRef = useRef<string | null>(null)
  const syncedMemberIdsRef = useRef<string[]>([])

  const membershipsKey = useMemo(
    () => memberships?.map(membership => membership.familyId).sort().join(',') ?? '',
    [memberships],
  )

  useEffect(() => {
    configureForegroundNotifications()
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function syncPushToken() {
      if (!profileId) return

      try {
        const baseMemberIds = await fetchActiveMemberIdsForProfile(profileId)
        const memberIds = getTargetMemberIds({
          baseMemberIds,
          authMemberId,
          effectiveMemberId,
          isKidMode,
        })

        if (memberIds.length === 0) {
          syncedMemberIdsRef.current = []
          return
        }

        const registration = await registerForPushNotificationsAsync()
        if (!registration || isCancelled) return

        const previousToken = syncedTokenRef.current
        const previousMemberIds = syncedMemberIdsRef.current

        await upsertPushTokens(
          memberIds.map(memberId => ({
            memberId,
            expoPushToken: registration.expoPushToken,
            platform: registration.platform,
            deviceId: registration.deviceId,
            deviceName: registration.deviceName,
            appVersion: registration.appVersion,
          })),
        )

        if (isCancelled) return

        const removedMemberIds = previousMemberIds.filter(memberId => !memberIds.includes(memberId))

        if (previousToken && previousToken !== registration.expoPushToken) {
          await deactivatePushTokensForMembers(previousToken, previousMemberIds)
        } else if (previousToken && removedMemberIds.length > 0) {
          await deactivatePushTokensForMembers(previousToken, removedMemberIds)
        }

        syncedTokenRef.current = registration.expoPushToken
        syncedMemberIdsRef.current = memberIds
      } catch (error) {
        console.error('Error syncing push token:', error)
      }
    }

    void syncPushToken()

    return () => {
      isCancelled = true
    }
  }, [authMemberId, effectiveMemberId, isKidMode, membershipsKey, profileId])

  const deactivateCurrentPushToken = useCallback(async () => {
    const expoPushToken = syncedTokenRef.current
    const memberIds = syncedMemberIdsRef.current

    if (!expoPushToken || memberIds.length === 0) return

    try {
      await deactivatePushTokensForMembers(expoPushToken, memberIds)
      syncedTokenRef.current = null
      syncedMemberIdsRef.current = []
    } catch (error) {
      console.error('Error deactivating push token:', error)
    }
  }, [])

  return {
    deactivateCurrentPushToken,
  }
}
