// lib/activities/activities.birthdays.ts
import type { FamilyMember } from "@/lib/members/members.types";
import { endOfLocalDay, toLocalDateKey } from "@/lib/activities/activities.format";
import type { Activity, ActivityParticipant } from "@/lib/activities/activities.types";

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** True if `day` is the annual birthday for `member` (handles Feb 29 → Feb 28 in non-leap years). */
export function isMemberBirthdayOnLocalDay(
  member: FamilyMember,
  day: Date,
): boolean {
  const raw = member.profile?.birth_date;
  if (!raw || raw.length < 10) return false;
  const parts = raw.split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return false;
  const birthMonth = parts[1] - 1;
  const birthDay = parts[2];
  const y = day.getFullYear();
  const dm = day.getMonth();
  const dd = day.getDate();

  if (birthMonth === 1 && birthDay === 29 && !isLeapYear(y)) {
    return dm === 1 && dd === 28;
  }
  return dm === birthMonth && dd === birthDay;
}

function displayName(member: FamilyMember): string {
  const nick = member.nickname?.trim();
  if (nick) return nick;
  const first = member.profile?.first_name?.trim();
  if (first) return first;
  return "Someone";
}

function buildBirthdayActivity(
  member: FamilyMember,
  day: Date,
  familyId: string,
): Activity {
  const dateKey = toLocalDateKey(day);
  const start = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = endOfLocalDay(day);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const id = `birthday:${member.id}:${dateKey}`;
  const title = `${displayName(member)}'s birthday`;

  const participant: ActivityParticipant = {
    id: `${id}:p`,
    activity_id: id,
    family_id: familyId,
    member_id: member.id,
    response: "YES",
    responded_at: null,
    is_creator: true,
    created_at: startIso,
  };

  return {
    id,
    family_id: familyId,
    title,
    start_at: startIso,
    end_at: endIso,
    location: null,
    money: null,
    ride_needed: false,
    present_needed: false,
    babysitter_needed: false,
    participants: [participant],
    notes: null,
    status: "APPROVED",
    created_by: member,
    created_at: startIso,
    isBirthday: true,
  };
}

/**
 * One synthetic full-day activity per family member whose birthday falls on a day in `[rangeStart, rangeEnd]` (local dates).
 */
export function buildBirthdayActivitiesForRange(
  members: FamilyMember[],
  rangeStart: Date,
  rangeEnd: Date,
  familyId: string,
): Activity[] {
  const out: Activity[] = [];
  const cursor = new Date(
    rangeStart.getFullYear(),
    rangeStart.getMonth(),
    rangeStart.getDate(),
  );
  const endDay = new Date(
    rangeEnd.getFullYear(),
    rangeEnd.getMonth(),
    rangeEnd.getDate(),
  );

  while (cursor.getTime() <= endDay.getTime()) {
    for (const m of members) {
      if (isMemberBirthdayOnLocalDay(m, cursor)) {
        out.push(buildBirthdayActivity(m, cursor, familyId));
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
