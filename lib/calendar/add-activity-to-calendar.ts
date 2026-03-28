// lib/calendar/add-activity-to-calendar.ts
import * as Calendar from "expo-calendar";
import { Alert, Platform } from "react-native";

import type { Activity } from "@/lib/activities/activities.types";

import { shareActivityToCalendar } from "./share-activity-calendar";

/** Avoid infinite await when the OS never resolves native calendar calls. */
const IS_AVAILABLE_TIMEOUT_MS = 10_000;
const REQUEST_PERMISSION_TIMEOUT_MS = 30_000;
const GET_CALENDAR_ID_TIMEOUT_MS = 10_000;
const CREATE_EVENT_TIMEOUT_MS = 30_000;
const OPEN_EVENT_IN_CALENDAR_TIMEOUT_MS = 12_000;

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
    const calendarId = await withTimeout(
      getWritableCalendarId(),
      GET_CALENDAR_ID_TIMEOUT_MS,
    );
    const notes = buildNotes(activity);
    const { startDate, endDate } = activity.isBirthday
      ? {
          startDate: new Date(activity.start_at),
          endDate: new Date(activity.end_at),
        }
      : eventStartEndForNative(activity);

    const eventId = await withTimeout(
      Calendar.createEventAsync(calendarId, {
        title: activity.title,
        startDate,
        endDate,
        allDay: !!activity.isBirthday,
        location: activity.location?.trim() || undefined,
        notes: notes || undefined,
      }),
      CREATE_EVENT_TIMEOUT_MS,
    );

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
