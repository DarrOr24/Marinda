export type PushPlatform = 'ios' | 'android'

export type PushTokenRow = {
  id: string
  member_id: string
  expo_push_token: string
  platform: PushPlatform
  device_id: string | null
  device_name: string | null
  app_version: string | null
  is_active: boolean
  last_seen_at: string
  created_at: string
  updated_at: string
}

export type PushTokenRegistration = {
  memberId: string
  expoPushToken: string
  platform: PushPlatform
  deviceId?: string | null
  deviceName?: string | null
  appVersion?: string | null
}

export type DevicePushRegistration = {
  expoPushToken: string
  platform: PushPlatform
  deviceId: string | null
  deviceName: string | null
  appVersion: string | null
}

export type ChoreCreatedNotificationData = {
  type: 'chore_created'
  familyId: string
  choreId: string
}

export type AppNotificationData =
  | ChoreCreatedNotificationData
