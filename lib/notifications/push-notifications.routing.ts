import type { Notification, NotificationResponse } from 'expo-notifications'
import { router } from 'expo-router'

import type { AppNotificationData } from './push-notifications.types'

type NotificationRoutingContext = {
  activeFamilyId: string | null
  setActiveFamilyId: (familyId: string | null) => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getAppNotificationData(data: unknown): AppNotificationData | null {
  if (!isRecord(data) || typeof data.type !== 'string') return null

  switch (data.type) {
    case 'chore_created':
      if (typeof data.familyId !== 'string' || typeof data.choreId !== 'string') {
        return null
      }

      return {
        type: 'chore_created',
        familyId: data.familyId,
        choreId: data.choreId,
      }
    default:
      return null
  }
}

async function routeNotificationData(
  payload: AppNotificationData,
  { activeFamilyId, setActiveFamilyId }: NotificationRoutingContext,
) {
  if (payload.familyId !== activeFamilyId) {
    await setActiveFamilyId(payload.familyId)
  }

  switch (payload.type) {
    case 'chore_created':
      router.push(`/chores?choreId=${encodeURIComponent(payload.choreId)}`)
      return
  }
}

export async function routePushNotification(
  notification: Notification,
  context: NotificationRoutingContext,
) {
  const payload = getAppNotificationData(notification.request.content.data)
  if (!payload) return

  await routeNotificationData(payload, context)
}

export async function routePushNotificationResponse(
  response: NotificationResponse,
  context: NotificationRoutingContext,
) {
  await routePushNotification(response.notification, context)
}
