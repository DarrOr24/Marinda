import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import type { DevicePushRegistration, PushPlatform } from './push-notifications.types'

let didConfigureNotificationHandler = false
const DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID = 'default'

function getPushPlatform(): PushPlatform | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS
  return null
}

function getExpoProjectId(): string | null {
  const easProjectId =
    Constants.easConfig?.projectId
    ?? (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId

  return easProjectId ?? null
}

export function configureForegroundNotifications() {
  if (didConfigureNotificationHandler || Platform.OS === 'web') return

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })

  didConfigureNotificationHandler = true
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return

  await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
  })
}

export async function registerForPushNotificationsAsync(): Promise<DevicePushRegistration | null> {
  const platform = getPushPlatform()
  if (!platform || !Device.isDevice) return null

  const currentPermissions = await Notifications.getPermissionsAsync()
  let finalStatus = currentPermissions.status

  if (finalStatus !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync()
    finalStatus = requestedPermissions.status
  }

  if (finalStatus !== 'granted') return null

  await ensureAndroidNotificationChannel()

  const projectId = getExpoProjectId()
  if (!projectId) {
    throw new Error('Missing EAS projectId required for Expo push notifications.')
  }

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId })

  return {
    expoPushToken,
    platform,
    deviceId: null,
    deviceName: Device.deviceName ?? Device.modelName ?? null,
    appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null,
  }
}
