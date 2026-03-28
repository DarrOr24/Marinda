// lib/calendar/add-activity-to-calendar.ts
import * as Calendar from "expo-calendar";
import {
  CalendarAccessLevel,
  type Calendar as ExpoDeviceCalendar,
} from "expo-calendar";
import { Alert, Platform } from "react-native";

import type { Activity } from "@/lib/activities/activities.types";

import { shareActivityToCalendar } from "./share-activity-calendar";

/** Avoid infinite await when the OS never resolves native calendar calls. */
const IS_AVAILABLE_TIMEOUT_MS = 10_000;
const REQUEST_PERMISSION_TIMEOUT_MS = 30_000;
const GET_CALENDAR_ID_TIMEOUT_MS = 10_000;
const CREATE_EVENT_TIMEOUT_MS_IOS = 30_000;
/** Android CalendarProvider inserts can be slow; some devices need a bit longer. */
const CREATE_EVENT_TIMEOUT_MS_ANDROID = 45_000;
const OPEN_EVENT_IN_CALENDAR_TIMEOUT_MS = 12_000;
const MAX_ANDROID_CALENDAR_ATTEMPTS = 6;

function createEventTimeoutMs(): number {
  return Platform.OS === "android"
    ? CREATE_EVENT_TIMEOUT_MS_ANDROID
    : CREATE_EVENT_TIMEOUT_MS_IOS;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function buildNotes(activity: Activity): string {
  const parts: string[] = [];
  if (activity.notes?.trim()) parts.push(activity.notes.trim());
  if (!activity.isBirthday) {
    if (activity.ride_needed) parts.push("Ride needed");
    if (activity.present_needed) parts.push("Present needed");
    if (activity.babysitter_needed) parts.push("Babysitter needed");
  }
  return parts.join("\n");
}

/** Ensures timed events have end strictly after start (some providers stall otherwise). */
function eventStartEndForNative(activity: Activity): {
  startDate: Date;
  endDate: Date;
} {
  const startDate = new Date(activity.start_at);
  let endDate = new Date(activity.end_at);
  if (!activity.isBirthday && endDate.getTime() <= startDate.getTime()) {
    endDate = new Date(startDate.getTime() + 60_000);
  }
  return { startDate, endDate };
}

async function getWritableCalendarId(): Promise<string> {
  const defaultCal = await Calendar.getDefaultCalendarAsync();
  if (defaultCal.allowsModifications) return defaultCal.id;

  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );
  const writable = calendars.find((c) => c.allowsModifications);
  if (writable) return writable.id;

  throw new Error("No writable calendar found on this device.");
}

/**
 * Android: `getDefaultCalendarAsync` / first `allowsModifications` calendar is often not one
 * the app can insert into (insert returns null). Prefer primary + synced writable calendars.
 */
function isStrongAndroidTargetCalendar(c: ExpoDeviceCalendar): boolean {
  if (!c.allowsModifications) return false;
  if (c.isSynced === false) return false;
  if (c.isVisible === false) return false;
  const level = c.accessLevel;
  if (
    level === CalendarAccessLevel.READ ||
    level === CalendarAccessLevel.NONE ||
    level === CalendarAccessLevel.FREEBUSY
  ) {
    return false;
  }
  return true;
}

function androidCalendarRank(c: ExpoDeviceCalendar): number {
  let score = 0;
  if (c.isPrimary) score += 100;
  if (c.isSynced === true) score += 25;
  if (c.accessLevel === CalendarAccessLevel.OWNER) score += 40;
  else if (c.accessLevel === CalendarAccessLevel.EDITOR) score += 35;
  else if (c.accessLevel === CalendarAccessLevel.CONTRIBUTOR) score += 28;
  return score;
}

async function getAndroidCalendarIdsOrdered(): Promise<string[]> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );
  const strong = calendars.filter(isStrongAndroidTargetCalendar);
  strong.sort((a, b) => androidCalendarRank(b) - androidCalendarRank(a));
  if (strong.length > 0) return strong.map((c) => c.id);
  const loose = calendars.filter((c) => c.allowsModifications);
  return loose.map((c) => c.id);
}

type EventCreateFields = {
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  notes?: string;
  timeZone?: string;
};

async function createEventWithAndroidFallbacks(
  calendarIds: string[],
  fields: EventCreateFields,
): Promise<string> {
  const slice = calendarIds.slice(0, MAX_ANDROID_CALENDAR_ATTEMPTS);
  let lastError: unknown;
  const ms = createEventTimeoutMs();
  for (const calId of slice) {
    try {
      return await withTimeout(Calendar.createEventAsync(calId, fields), ms);
    } catch (e) {
      lastError = e;
      console.warn(
        "addActivityToCalendar android: create failed for calendar",
        calId,
        e,
      );
    }
  }
  throw lastError ?? new Error("Could not save event to device calendar");
}

/**
 * Adds the activity to the device’s default (or first writable) calendar,
 * then opens it in the system Calendar app. Falls back to .ics share where
 * native calendar APIs are unavailable or permission is denied.
 */
export async function addActivityToCalendar(activity: Activity): Promise<void> {
  if (Platform.OS === "web") {
    await shareActivityToCalendar(activity);
    return;
  }

  let available: boolean;
  try {
    available = await withTimeout(
      Calendar.isAvailableAsync(),
      IS_AVAILABLE_TIMEOUT_MS,
    );
  } catch {
    await shareActivityToCalendar(activity);
    return;
  }
  if (!available) {
    await shareActivityToCalendar(activity);
    return;
  }

  let permissionStatus: string;
  try {
    const perm = await withTimeout(
      Calendar.requestCalendarPermissionsAsync(),
      REQUEST_PERMISSION_TIMEOUT_MS,
    );
    permissionStatus = perm.status;
  } catch {
    await shareActivityToCalendar(activity);
    return;
  }
  if (permissionStatus !== "granted") {
    await shareActivityToCalendar(activity);
    return;
  }

  try {
    const notes = buildNotes(activity);
    const { startDate, endDate } = activity.isBirthday
      ? {
          startDate: new Date(activity.start_at),
          endDate: new Date(activity.end_at),
        }
      : eventStartEndForNative(activity);

    const fields: EventCreateFields = {
      title: activity.title,
      startDate,
      endDate,
      allDay: !!activity.isBirthday,
      location: activity.location?.trim() || undefined,
      notes: notes || undefined,
      ...(Platform.OS === "android"
        ? {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        : {}),
    };

    let eventId: string;
    if (Platform.OS === "android") {
      const calendarIds = await withTimeout(
        getAndroidCalendarIdsOrdered(),
        GET_CALENDAR_ID_TIMEOUT_MS,
      );
      if (calendarIds.length === 0) {
        throw new Error("No writable calendar found on this device.");
      }
      eventId = await createEventWithAndroidFallbacks(calendarIds, fields);
    } else {
      const calendarId = await withTimeout(
        getWritableCalendarId(),
        GET_CALENDAR_ID_TIMEOUT_MS,
      );
      eventId = await withTimeout(
        Calendar.createEventAsync(calendarId, fields),
        createEventTimeoutMs(),
      );
    }

    try {
      await withTimeout(
        Calendar.openEventInCalendarAsync({ id: eventId }),
        OPEN_EVENT_IN_CALENDAR_TIMEOUT_MS,
      );
    } catch {
      Alert.alert(
        "Added to calendar",
        "The event was saved. Open your Calendar app to view it.",
      );
    }
  } catch (e) {
    console.warn("addActivityToCalendar native failed, falling back to share", e);
    await shareActivityToCalendar(activity);
  }
}
