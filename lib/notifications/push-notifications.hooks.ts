import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'

import { routePushNotificationResponse } from './push-notifications.routing'

type UsePushNotificationRoutingParams = {
  activeFamilyId: string | null
  setActiveFamilyId: (familyId: string | null) => Promise<void>
  isEnabled: boolean
}

export function usePushNotificationRouting({
  activeFamilyId,
  setActiveFamilyId,
  isEnabled,
}: UsePushNotificationRoutingParams) {
  const handledResponseIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isEnabled) return

    let isMounted = true

    const handleResponse = async (response: Notifications.NotificationResponse | null) => {
      if (!response) return

      const responseId = response.notification.request.identifier
      if (handledResponseIdsRef.current.has(responseId)) return

      handledResponseIdsRef.current.add(responseId)

      await routePushNotificationResponse(response, {
        activeFamilyId,
        setActiveFamilyId,
      })
    }

    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (!isMounted) return
      void handleResponse(response)
    })

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      void handleResponse(response)
    })

    return () => {
      isMounted = false
      subscription.remove()
    }
  }, [activeFamilyId, isEnabled, setActiveFamilyId])
}
