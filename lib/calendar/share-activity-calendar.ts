// lib/calendar/share-activity-calendar.ts
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { Activity } from "@/lib/activities/activities.types";

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

function formatUtcCompact(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "19700101T000000Z";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

function localDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function addLocalDays(base: Date, days: number): Date {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + days,
  );
}

function buildIcs(activity: Activity): string {
  const stamp = formatUtcCompact(new Date().toISOString());
  const uid = `${activity.id.replace(/[^a-zA-Z0-9@._-]/g, "-")}@marinda`;

  const summary = escapeIcsText(activity.title);

  const descParts: string[] = [];
  if (activity.notes?.trim()) descParts.push(activity.notes.trim());
  if (!activity.isBirthday) {
    if (activity.ride_needed) descParts.push("Ride needed");
    if (activity.present_needed) descParts.push("Present needed");
    if (activity.babysitter_needed) descParts.push("Babysitter needed");
  }
  const description = descParts.length
    ? escapeIcsText(descParts.join("\n"))
    : "";

  const location = activity.location?.trim()
    ? escapeIcsText(activity.location.trim())
    : "";

  let dtStart: string;
  let dtEnd: string;

  if (activity.isBirthday) {
    const start = new Date(activity.start_at);
    const endExclusive = addLocalDays(start, 1);
    dtStart = `DTSTART;VALUE=DATE:${localDateYmd(start)}`;
    dtEnd = `DTEND;VALUE=DATE:${localDateYmd(endExclusive)}`;
  } else {
    dtStart = `DTSTART:${formatUtcCompact(activity.start_at)}`;
    dtEnd = `DTEND:${formatUtcCompact(activity.end_at)}`;
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Marinda//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    dtStart,
    dtEnd,
    `SUMMARY:${summary}`,
  ];

  if (description) lines.push(`DESCRIPTION:${description}`);
  if (location) lines.push(`LOCATION:${location}`);

  lines.push("END:VEVENT", "END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
}

/**
 * expo-sharing rejects concurrent shareAsync on Android ("Another share request…").
 * Run shares one at a time.
 */
let shareQueue: Promise<void> = Promise.resolve();

/**
 * Writes a single-event .ics file and opens the system share sheet so the user can
 * import into Apple Calendar, Google Calendar, etc.
 */
export async function shareActivityToCalendar(activity: Activity): Promise<void> {
  const next = shareQueue.then(
    () => runShareActivityToCalendar(activity),
    () => runShareActivityToCalendar(activity),
  );
  shareQueue = next.catch(() => {});
  await next;
}

async function runShareActivityToCalendar(activity: Activity): Promise<void> {
  const base = FileSystem.cacheDirectory;
  if (!base) {
    throw new Error("Cache directory unavailable");
  }

  const safe = activity.id.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 96);
  const path = `${base}marinda-${safe}.ics`;
  const ics = buildIcs(activity);

  await FileSystem.writeAsStringAsync(path, ics, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available");
  }

  await Sharing.shareAsync(path, {
    mimeType: "text/calendar",
    UTI: "com.apple.ical.ics",
    dialogTitle: "Add to calendar",
  });
}
