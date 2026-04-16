// app/boards/activity.tsx
import {
  captureViewAsJpegAndShare,
  captureViewsAsJpegsAndShareTogether,
} from "@/lib/share/capture-scroll-jpeg";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { ActivityCalendarAttendeeFilter } from "@/components/boards/activity-calendar-attendee-filter";
import {
  ActivityBoardHeaderNav,
  BOARD_NAV_BTN_SIZE,
} from "@/components/boards/activity-board-header-nav";
import {
  ActivityDayView,
  type ActivityDayViewExportHandle,
} from "@/components/boards/activity-day-view";
import {
  CalendarDateModal,
  toLocalYmdFromIso,
} from "@/components/calendar-date-modal";
import { ActivityDetailModal } from "@/components/modals/activity-detail-modal";
import AddActivityModal, { type NewActivityForm } from "@/components/modals/add-activity-modal";
import { Button, SafeFab, Screen } from "@/components/ui";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  invalidateActivitySeries,
  invalidateFamilyActivities,
  useCreateActivity,
  useCreateActivitySeries,
  useDeleteActivity,
  useFamilyCalendarActivities,
  useUpdateActivity,
} from "@/lib/activities/activities.hooks";
import {
  cancelSeriesOccurrence,
  continuationRecurrenceRule,
  fetchActivitySeriesById,
  patchActivitySeries,
  splitSeriesForFutureEdits,
  truncateSeriesFromOccurrence,
  updateEntireSeriesFromForm,
  upsertSeriesOccurrenceModified,
} from "@/lib/activities/activities.series.api";
import { buildBirthdayActivitiesForRange } from "@/lib/activities/activities.birthdays";
import { filterActivitiesByAttendees } from "@/lib/activities/activities.attendee-filter";
import { getActivityRowAccentColor } from "@/lib/activities/activities.accent-color";
import { normalizeRecurrenceRule } from "@/lib/activities/activities.recurrence";
import {
  collectLocalDateKeysOverlappingRange,
  endOfLocalDay,
  formatActivityTimeRange,
  toLocalDateKey,
} from "@/lib/activities/activities.format";
import type {
  Activity,
  ActivityInsert,
  ActivityParticipantUpsert,
  ActivitySeriesInsert,
  ActivityStatus,
  RecurrenceRule,
} from "@/lib/activities/activities.types";
import { useFamily } from "@/lib/families/families.hooks";
import type { FamilyMember } from "@/lib/members/members.types";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MIN_PAST_WEEKS = -4;
/**
 * Target max height per shared JPEG (logical px) ≈ phone-style portrait (height ~2.05× width)
 * so exports are not extreme “ribbon” strips. Taller weeks split into more images.
 */
const PORTRAIT_EXPORT_HEIGHT_TO_WIDTH = 2.05;

/** Split `dayCount` consecutive days into `parts` contiguous ranges (as equal as possible). */
function equalDaySliceRanges(
  dayCount: number,
  parts: number,
): { lo: number; hi: number }[] {
  if (parts <= 1 || dayCount <= 0) return [{ lo: 0, hi: dayCount }];
  const n = Math.min(parts, dayCount);
  if (n <= 1) return [{ lo: 0, hi: dayCount }];
  const base = Math.floor(dayCount / n);
  const rem = dayCount % n;
  const out: { lo: number; hi: number }[] = [];
  let lo = 0;
  for (let p = 0; p < n; p++) {
    const sz = base + (p < rem ? 1 : 0);
    const hi = lo + sz;
    out.push({ lo, hi });
    lo = hi;
  }
  return out;
}

function getStartOfWeek(d = new Date()) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function addDays(date: Date, days: number) {
  const dd = new Date(date);
  dd.setDate(dd.getDate() + days);
  return dd;
}
function addWeeks(date: Date, weeks: number) {
  return addDays(date, weeks * 7);
}
function formatRangeLabel(start: Date) {
  const end = addDays(start, 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${start.toLocaleDateString(undefined, {
      month: "short",
    })} ${start.getDate()}–${end.getDate()}`
    : `${fmt(start)} – ${fmt(end)}`;
}
function formatTimeFromIso(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Pre-fill the create form when duplicating a single (non-series) activity. */
function duplicateInitialFromActivity(
  a: Activity,
  selfMemberId: string | undefined,
): Partial<NewActivityForm> {
  const ids = new Set<string>();
  for (const p of a.participants ?? []) ids.add(p.member_id);
  if (selfMemberId) ids.add(selfMemberId);
  return {
    title: a.title,
    start_at: a.start_at,
    end_at: a.end_at,
    location: a.location ?? undefined,
    money: a.money ?? undefined,
    ride_needed: !!a.ride_needed,
    present_needed: !!a.present_needed,
    babysitter_needed: !!a.babysitter_needed,
    participants_member_ids: [...ids],
    notes: a.notes ?? undefined,
  };
}

/** Stable ISO for calendar `initialAt` (avoids UTC shifting the local date). */
function noonLocalIso(d: Date): string {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    12,
    0,
    0,
    0,
  ).toISOString();
}

/** Weeks from `anchorStartOfWeek` (Sunday 0:00) to the week containing `pickedLocalDay`. */
function weekOffsetForContainingWeek(
  anchorStartOfWeek: Date,
  pickedLocalDay: Date,
): number {
  const picked = new Date(
    pickedLocalDay.getFullYear(),
    pickedLocalDay.getMonth(),
    pickedLocalDay.getDate(),
  );
  const pickedWeekStart = getStartOfWeek(picked);
  const ms = pickedWeekStart.getTime() - anchorStartOfWeek.getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

export default function ActivityBoard() {
  const today = new Date();
  const { effectiveMember, activeFamilyId, hasParentPermissions } =
    useAuthContext() as any;
  const { familyMembers } = useFamily(activeFamilyId);

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [addOpen, setAddOpen] = useState(false);
  /** Source activity when opening Add in duplicate mode (single events only). */
  const [duplicateFrom, setDuplicateFrom] = useState<Activity | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [seriesEditScope, setSeriesEditScope] = useState<"single" | "forward" | null>(
    null,
  );
  /** Loaded rule when editing "This and future" — `undefined` = not series / single-occurrence edit. */
  const [seriesRecurrenceForEdit, setSeriesRecurrenceForEdit] = useState<
    RecurrenceRule | null | undefined
  >(undefined);
  /** Read-only rule for "This event only" — `undefined` = not that flow. */
  const [seriesRecurrenceReadOnly, setSeriesRecurrenceReadOnly] = useState<
    RecurrenceRule | null | undefined
  >(undefined);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const queryClient = useQueryClient();
  /** Full-screen hour timeline for one day (within the visible week). */
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  /** Parent: filter by participant member ids; empty = everyone. */
  const [attendeeFilterMemberIds, setAttendeeFilterMemberIds] = useState<string[]>(
    [],
  );
  /** Kid profile: all family events vs only events where the kid is a participant. */
  const [kidEventsScope, setKidEventsScope] = useState<"family" | "mine">(
    "family",
  );
  /** Month picker: which header opened it (`null` = closed). */
  const [calendarNav, setCalendarNav] = useState<null | "week" | "day">(null);

  const weekScrollRef = useRef<ScrollView>(null);
  /** Readable off-screen clone of the week list for JPEG export (main list stays compact). */
  const weekExportFullRef = useRef<View>(null);
  const weekExportFullHeightRef = useRef(0);
  const weekExportChunkRefs = useRef<(View | null)[]>([]);
  const weekExportCaptureCursorRef = useRef<View | null>(null);
  const dayExportRef = useRef<ActivityDayViewExportHandle | null>(null);
  const [exportingImage, setExportingImage] = useState(false);
  const [weekExportPartCount, setWeekExportPartCount] = useState(1);

  const startOfThisWeek = useMemo(() => getStartOfWeek(today), [today]);
  const visibleWeekStart = useMemo(
    () => addWeeks(startOfThisWeek, weekOffset),
    [startOfThisWeek, weekOffset]
  );
  const visibleWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(visibleWeekStart, i)),
    [visibleWeekStart]
  );
  const { width: windowWidth } = useWindowDimensions();
  /** Full device width so shared JPEGs read like phone-portrait frames, not a narrow strip. */
  const weekExportContentWidth = Math.max(0, windowWidth);
  const weekExportMaxChunkHeight = Math.max(
    480,
    Math.round(windowWidth * PORTRAIT_EXPORT_HEIGHT_TO_WIDTH),
  );
  const rangeLabel = formatRangeLabel(visibleWeekStart);
  const visibleWeekFirstKey = toLocalDateKey(visibleWeekDays[0]!);

  useEffect(() => {
    setWeekExportPartCount(1);
  }, [visibleWeekFirstKey]);
  const pastCapped = weekOffset <= MIN_PAST_WEEKS;
  const isPastWeek = weekOffset < 0;

  const minCalendarDateYmd = useMemo(
    () => toLocalDateKey(addWeeks(startOfThisWeek, MIN_PAST_WEEKS)),
    [startOfThisWeek],
  );

  const calendarModalInitialAt = useMemo(() => {
    if (calendarNav === "day" && dayViewDate) return noonLocalIso(dayViewDate);
    return noonLocalIso(visibleWeekStart);
  }, [calendarNav, dayViewDate, visibleWeekStart]);

  const { data: activities = [], isLoading } = useFamilyCalendarActivities(
    activeFamilyId,
    {
      from: visibleWeekDays[0],
      to: endOfLocalDay(visibleWeekDays[6]),
    }
  );

  const birthdayActivities = useMemo(() => {
    if (!activeFamilyId) return [];
    const members = (familyMembers.data ?? []) as FamilyMember[];
    return buildBirthdayActivitiesForRange(
      members,
      visibleWeekDays[0],
      endOfLocalDay(visibleWeekDays[6]),
      activeFamilyId,
    );
  }, [activeFamilyId, familyMembers.data, visibleWeekDays]);

  const filteredActivities = useMemo(() => {
    const merged = [...activities, ...birthdayActivities];
    if (!effectiveMember?.id) return merged;
    if (!hasParentPermissions) {
      return filterActivitiesByAttendees(merged, {
        kind: "kid",
        scope: kidEventsScope,
        selfMemberId: effectiveMember.id,
      });
    }
    return filterActivitiesByAttendees(merged, {
      kind: "parent",
      memberIds: attendeeFilterMemberIds,
    });
  }, [
    activities,
    birthdayActivities,
    hasParentPermissions,
    kidEventsScope,
    effectiveMember?.id,
    attendeeFilterMemberIds,
  ]);

  const createMut = useCreateActivity(activeFamilyId);
  const createSeriesMut = useCreateActivitySeries(activeFamilyId);
  const updateMut = useUpdateActivity(activeFamilyId);
  const deleteMut = useDeleteActivity(activeFamilyId);

  function refreshCalendarData() {
    invalidateFamilyActivities(queryClient, activeFamilyId);
    invalidateActivitySeries(queryClient, activeFamilyId);
  }

  // Fast lookup for members (for dots and names)
  const memberById = useMemo(() => {
    const list = (familyMembers.data ?? []).length
      ? (familyMembers.data as any)
      : [];
    const map = new Map<string, any>();
    for (const m of list) map.set(m.id, m);
    return map;
  }, [familyMembers.data]);

  function openAddModal() {
    setDuplicateFrom(null);
    setAddOpen(true);
  }

  function closeAddModal() {
    setAddOpen(false);
    setDuplicateFrom(null);
  }

  function activityColor(status: ActivityStatus, color: string) {
    if (status === "NOT_APPROVED") {
      return {
        borderColor: "#cbd5e1",
        backgroundColor: "#f1f5f9",
      };
    }
    return {
      borderColor: color,
      backgroundColor: status === "APPROVED" ? `${color}22` : "#fff",
    };
  }

  function creatorName(a: Activity) {
    const prof = (a.created_by?.profile as any) || undefined;
    if (prof?.first_name || prof?.last_name) {
      return `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim();
    }
    const m = a.created_by?.id ? memberById.get(a.created_by.id) : undefined;
    return m?.name ?? m?.user?.email ?? "Someone";
  }

  function rowAccentColor(a: Activity) {
    return getActivityRowAccentColor(a, memberById);
  }

  function showDetails(a: Activity) {
    setDetailActivity(a);
  }

  // Group by each local calendar day the activity overlaps (multi-day → card on each day).
  const byDate = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    for (const a of filteredActivities) {
      for (const key of collectLocalDateKeysOverlappingRange(
        a.start_at,
        a.end_at,
      )) {
        (map[key] ??= []).push(a);
      }
    }
    for (const k of Object.keys(map)) {
      map[k].sort(
        (x, y) =>
          new Date(x.start_at).getTime() - new Date(y.start_at).getTime(),
      );
    }
    return map;
  }, [filteredActivities]);

  // Create
  function handleSaveActivity(form: NewActivityForm) {
    if (!activeFamilyId || !effectiveMember?.id) return;

    const participants: ActivityParticipantUpsert[] = (
      form.participants_member_ids ?? []
    ).map((id) => ({
      member_id: id,
      response: id === effectiveMember.id ? "YES" : "MAYBE",
      is_creator: id === effectiveMember.id,
    }));

    if (form.recurrence) {
      const series: ActivitySeriesInsert = {
        family_id: activeFamilyId,
        title: form.title,
        location: form.location ?? null,
        money: form.money ?? null,
        ride_needed: !!form.ride_needed,
        present_needed: !!form.present_needed,
        babysitter_needed: !!form.babysitter_needed,
        notes: form.notes ?? null,
        created_by: effectiveMember.id,
        first_start_at: form.start_at,
        first_end_at: form.end_at,
        recurrence: form.recurrence,
      };
      createSeriesMut.mutate({ series, participants });
      return;
    }

    const activity: ActivityInsert = {
      family_id: activeFamilyId,
      title: form.title,
      start_at: form.start_at,
      end_at: form.end_at,
      location: form.location ?? null,
      money: form.money ?? null,
      ride_needed: !!form.ride_needed,
      present_needed: !!form.present_needed,
      babysitter_needed: !!form.babysitter_needed,
      notes: form.notes ?? null,
      created_by: effectiveMember.id,
    };

    createMut.mutate({ activity, participants });
  }

  // Edit (patch+participants, or recurring series exception / split)
  async function handleUpdateActivity(form: NewActivityForm) {
    if (!editingActivity || !activeFamilyId || !effectiveMember?.id) return;

    const participants: ActivityParticipantUpsert[] = (
      form.participants_member_ids ?? []
    ).map((id) => ({
      member_id: id,
      response: id === effectiveMember.id ? "YES" : "MAYBE",
      is_creator: id === effectiveMember.id,
    }));

    const meta = editingActivity.seriesOccurrence;

    if (meta && seriesEditScope) {
      try {
        if (seriesEditScope === "single") {
          await upsertSeriesOccurrenceModified({
            seriesId: meta.seriesId,
            familyId: activeFamilyId,
            occurrenceStart: meta.occurrenceStart,
            overrideStartAt: form.start_at,
            overrideEndAt: form.end_at,
            overrideData: {
              title: form.title,
              location: form.location ?? null,
              money: form.money ?? null,
              ride_needed: !!form.ride_needed,
              present_needed: !!form.present_needed,
              babysitter_needed: !!form.babysitter_needed,
              notes: form.notes ?? null,
            },
          });
        } else {
          const series = await fetchActivitySeriesById(meta.seriesId);
          if (!series) {
            setEditingActivity(null);
            setSeriesEditScope(null);
            setEditOpen(false);
            return;
          }
          const occMs = new Date(meta.occurrenceStart).getTime();
          const firstMs = new Date(series.first_start_at).getTime();
          const isFirst = Math.abs(occMs - firstMs) < 2000;

          if (isFirst) {
            await updateEntireSeriesFromForm({
              seriesId: meta.seriesId,
              form,
              participants,
              familyId: activeFamilyId,
            });
          } else {
            const nextRule = form.recurrence
              ? normalizeRecurrenceRule(form.recurrence)
              : continuationRecurrenceRule(
                  normalizeRecurrenceRule(series.recurrence),
                );
            const newSeries: ActivitySeriesInsert = {
              family_id: activeFamilyId,
              title: form.title,
              location: form.location ?? null,
              money: form.money ?? null,
              ride_needed: !!form.ride_needed,
              present_needed: !!form.present_needed,
              babysitter_needed: !!form.babysitter_needed,
              notes: form.notes ?? null,
              created_by: series.created_by.id,
              first_start_at: form.start_at,
              first_end_at: form.end_at,
              recurrence: nextRule,
            };
            await splitSeriesForFutureEdits({
              oldSeriesId: meta.seriesId,
              occurrenceStart: meta.occurrenceStart,
              newSeries,
              participants,
            });
          }
        }
        refreshCalendarData();
      } catch (e) {
        console.error("[handleUpdateActivity series]", e);
      }
      setEditingActivity(null);
      setSeriesEditScope(null);
      setEditOpen(false);
      return;
    }

    const patch: Partial<ActivityInsert> & {
      status?: ActivityStatus;
      rejection_reason?: string | null;
    } = {
      title: form.title,
      start_at: form.start_at,
      end_at: form.end_at,
      location: form.location ?? null,
      money: form.money ?? null,
      ride_needed: !!form.ride_needed,
      present_needed: !!form.present_needed,
      babysitter_needed: !!form.babysitter_needed,
      notes: form.notes ?? null,
      ...(hasParentPermissions ? {} : { status: "PENDING" as ActivityStatus }),
    };

    const participantsUpdate: ActivityParticipantUpsert[] = (
      form.participants_member_ids ?? []
    ).map((id) => ({
      member_id: id,
    }));

    updateMut.mutate({
      id: editingActivity.id,
      patch,
      participants: participantsUpdate,
      replaceParticipants: true,
    });

    setEditingActivity(null);
    setEditOpen(false);
  }

  const todayKey = toLocalDateKey(today);

  const dayViewDayKey = dayViewDate ? toLocalDateKey(dayViewDate) : null;
  const dayViewIndex =
    dayViewDate != null
      ? visibleWeekDays.findIndex((d) => toLocalDateKey(d) === dayViewDayKey)
      : -1;
  const dayViewActivities =
    dayViewDayKey && byDate[dayViewDayKey] ? byDate[dayViewDayKey] : [];

  function openDayView(d: Date) {
    setDayViewDate(new Date(d.getTime()));
  }

  function closeDayView() {
    setDayViewDate(null);
  }

  function shiftDayView(delta: number) {
    if (dayViewIndex < 0) return;
    const next = dayViewIndex + delta;
    if (next < 0 || next > 6) return;
    setDayViewDate(new Date(visibleWeekDays[next].getTime()));
  }

  function renderWeekExportHeader(partIndex?: number, partCount?: number) {
    return (
      <View style={styles.weekExportHeader}>
        <Text style={styles.weekExportHeaderTitle}>Weekly schedule</Text>
        <Text style={styles.weekExportHeaderSubtitle}>{rangeLabel}</Text>
        {partIndex != null && partCount != null && partCount > 1 ? (
          <Text style={styles.weekExportHeaderPart}>
            Part {partIndex} of {partCount}
          </Text>
        ) : null}
      </View>
    );
  }

  function renderWeekDayRow(d: Date, readable: boolean) {
    const isToday = toLocalDateKey(d) === todayKey && weekOffset === 0;
    const key = toLocalDateKey(d);
    const items = byDate[key] || [];
    const titleStyle = readable ? styles.itemTitleExport : styles.itemTitle;
    const timeStyle = readable ? styles.itemTimeExport : styles.itemTime;
    const placeholderStyle = readable
      ? styles.placeholderExport
      : styles.placeholder;

    return (
      <View key={key} style={[styles.dayRow, isToday && styles.dayRowToday]}>
        <TouchableOpacity
          style={styles.dayHeader}
          onPress={() => openDayView(d)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Day view for ${DAY_NAMES[d.getDay()]} ${d.getDate()}`}
        >
          <MaterialCommunityIcons
            name="arrow-expand"
            size={18}
            color={isToday ? "#3b82f6" : "#94a3b8"}
            style={styles.dayHeaderExpandIcon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
            {DAY_NAMES[d.getDay()]}
          </Text>
          <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
            {d.getDate()}
          </Text>
        </TouchableOpacity>

        <View style={styles.dayContent}>
          {isLoading && items.length === 0 ? (
            <Text style={placeholderStyle}>Loading…</Text>
          ) : items.length === 0 ? (
            <Text style={placeholderStyle}>No activities</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {items.map((a) => {
                const color = rowAccentColor(a);
                const base = activityColor(a.status, color);

                const badgeIcons = [
                  a.isBirthday && (
                    <MaterialCommunityIcons
                      key="cake"
                      name="cake-variant"
                      size={readable ? 18 : 16}
                      color={color}
                    />
                  ),
                  a.ride_needed && (
                    <MaterialCommunityIcons
                      key="ride"
                      name="car-outline"
                      size={readable ? 18 : 16}
                      color="#64748b"
                    />
                  ),
                  a.present_needed && (
                    <MaterialCommunityIcons
                      key="present"
                      name="gift-outline"
                      size={readable ? 18 : 16}
                      color="#64748b"
                    />
                  ),
                  a.babysitter_needed && (
                    <MaterialCommunityIcons
                      key="babysitter"
                      name="baby-face-outline"
                      size={readable ? 18 : 16}
                      color="#64748b"
                    />
                  ),
                ].filter(Boolean);

                return (
                  <Pressable
                    key={a.id}
                    onPress={() => showDetails(a)}
                    style={[
                      styles.itemRow,
                      base,
                      a.status === "PENDING" && styles.itemPending,
                    ]}
                  >
                    <View style={styles.itemLine1}>
                      <Text numberOfLines={2} style={titleStyle}>
                        {a.title}
                      </Text>
                    </View>

                    {a.start_at ? (
                      <View style={styles.itemLine2}>
                        <Text style={timeStyle}>
                          {a.isBirthday
                            ? "All day"
                            : formatActivityTimeRange(
                                a.start_at,
                                a.end_at,
                              )}
                        </Text>
                        <View style={styles.itemLine2Spacer} />
                        {badgeIcons.length > 0 ? (
                          <View style={styles.badgeIconsRow}>{badgeIcons}</View>
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  }

  async function handleExportImage() {
    if (exportingImage) return;
    if (dayViewDate) {
      if (!dayExportRef.current) {
        Alert.alert(
          "Export",
          "Calendar isn’t ready yet. Try again in a moment.",
        );
        return;
      }
    } else if (!weekExportFullRef.current) {
      Alert.alert(
        "Export",
        "Calendar isn’t ready yet. Try again in a moment.",
      );
      return;
    }
    setExportingImage(true);
    try {
      const ws = visibleWeekStart;
      const weekSlug = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
      const base = dayViewDate
        ? `events_day_${toLocalDateKey(dayViewDate)}`
        : weekOffset === 0
          ? "events_week_this"
          : `events_week_${weekSlug}`;
      if (dayViewDate) {
        const dayExport = dayExportRef.current;
        if (!dayExport) {
          throw new Error("Day export is not ready yet.");
        }
        await dayExport.exportScheduleImages(base);
      } else {
        await new Promise((r) => setTimeout(r, 32));
        const n = weekExportPartCount;
        if (n <= 1) {
          await captureViewAsJpegAndShare(weekExportFullRef, base);
        } else {
          const steps: { viewRef: RefObject<View | null>; fileBaseName: string }[] =
            [];
          for (let i = 0; i < n; i++) {
            const idx = i;
            steps.push({
              viewRef: {
                get current() {
                  return weekExportChunkRefs.current[idx] ?? null;
                },
              },
              fileBaseName: `${base}_${i + 1}`,
            });
          }
          await captureViewsAsJpegsAndShareTogether(steps);
        }
      }
    } catch (e) {
      console.error("[handleExportImage]", e);
      Alert.alert(
        "Could not export",
        e instanceof Error
          ? e.message
          : "If the week is very busy, try exporting one day at a time.",
      );
    } finally {
      setExportingImage(false);
    }
  }

  const exportHeaderAccessory = (
    <Pressable
      onPress={() => void handleExportImage()}
      disabled={exportingImage}
      style={({ pressed }) => [
        styles.headerExportBtn,
        pressed && { opacity: 0.75 },
        exportingImage && { opacity: 0.45 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        dayViewDate
          ? "Export this day as an image"
          : "Export this week as an image"
      }
    >
      <MaterialCommunityIcons
        name="image-outline"
        size={20}
        color="#2563eb"
      />
    </Pressable>
  );

  const addModalInitialDateStr = dayViewDate
    ? toLocalDateKey(dayViewDate)
    : today.toISOString().split("T")[0];

  const attendeeFilter = (
    <ActivityCalendarAttendeeFilter
      members={(familyMembers.data ?? []) as FamilyMember[]}
      loading={familyMembers.isLoading || familyMembers.isFetching}
      mode={!hasParentPermissions ? "kid" : "parent"}
      parentSelectedIds={attendeeFilterMemberIds}
      onParentSelectedIdsChange={setAttendeeFilterMemberIds}
      kidScope={kidEventsScope}
      onKidScopeChange={setKidEventsScope}
      kidSelfMemberId={effectiveMember?.id}
    />
  );

  return (
    <Screen
      scroll={false}
      withBackground={false}
      contentStyle={{ paddingTop: 8, paddingHorizontal: 0, paddingBottom: 0 }}
      overlay={
        <SafeFab bottomOffset={18} rightOffset={16}>
          <Button
            type="primary"
            size="xl"
            round
            onPress={openAddModal}
            leftIcon={<MaterialCommunityIcons name="plus" size={26} />}
          />
        </SafeFab>
      }
    >
      <View style={[styles.center, dayViewDate && styles.centerDayTimeline]}>
        {attendeeFilter}

        {dayViewDate ? (
          <ActivityDayView
            ref={dayExportRef}
            day={dayViewDate}
            activities={dayViewActivities}
            onClose={closeDayView}
            onPrevDay={() => shiftDayView(-1)}
            onNextDay={() => shiftDayView(1)}
            canPrevDay={dayViewIndex > 0}
            canNextDay={dayViewIndex >= 0 && dayViewIndex < 6}
            onActivityPress={showDetails}
            activityColor={rowAccentColor}
            activityColorStyle={activityColor}
            formatTimeRange={formatActivityTimeRange}
            onCalendarPress={() => setCalendarNav("day")}
            topBarEndAccessory={exportHeaderAccessory}
          />
        ) : (
          <>
        {/* Header w/ week navigation */}
        <ActivityBoardHeaderNav
          title={weekOffset === 0 ? "This week" : rangeLabel}
          onPrev={() => {
            if (!pastCapped) {
              setWeekOffset((o) => Math.max(MIN_PAST_WEEKS, o - 1));
            }
          }}
          onNext={() => setWeekOffset((o) => o + 1)}
          canPrev={!pastCapped}
          canNext
          prevAccessibilityLabel="Previous week"
          nextAccessibilityLabel="Next week"
          titleVariant="week"
          onCalendarPress={() => setCalendarNav("week")}
          endAccessory={exportHeaderAccessory}
        />

        {/* Weekly list — scrolls; week nav header stays fixed (Screen scroll off) */}
        <ScrollView
          ref={weekScrollRef}
          style={[styles.weekScroll, isPastWeek ? { opacity: 0.6 } : undefined]}
          contentContainerStyle={styles.weekListScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          collapsable={false}
        >
          <View collapsable={false} style={styles.weekCaptureContent}>
            {visibleWeekDays.map((d) => renderWeekDayRow(d, false))}
          </View>
        </ScrollView>

        <View
          style={[
            styles.weekExportHiddenHost,
            { width: weekExportContentWidth },
          ]}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          <View
            ref={weekExportFullRef}
            collapsable={false}
            renderToHardwareTextureAndroid={false}
            onLayout={(e) => {
              const H = e.nativeEvent.layout.height;
              weekExportFullHeightRef.current = H;
              const maxH = weekExportMaxChunkHeight;
              const nextN =
                H <= maxH || H === 0
                  ? 1
                  : Math.min(
                      visibleWeekDays.length,
                      Math.ceil(H / maxH),
                    );
              setWeekExportPartCount((prev) =>
                prev !== nextN ? nextN : prev,
              );
            }}
            style={styles.weekExportStack}
          >
            {renderWeekExportHeader()}
            <View style={styles.weekCaptureContent}>
              {visibleWeekDays.map((d) => renderWeekDayRow(d, true))}
            </View>
          </View>

          {weekExportPartCount > 1
            ? equalDaySliceRanges(
                visibleWeekDays.length,
                weekExportPartCount,
              ).map(({ lo, hi }, i) => (
                <View
                  key={`week-export-${lo}-${hi}`}
                  ref={(node) => {
                    weekExportChunkRefs.current[i] = node;
                  }}
                  collapsable={false}
                  renderToHardwareTextureAndroid={false}
                  style={styles.weekExportStack}
                >
                  {renderWeekExportHeader(i + 1, weekExportPartCount)}
                  <View style={styles.weekCaptureContent}>
                    {visibleWeekDays
                      .slice(lo, hi)
                      .map((d) => renderWeekDayRow(d, true))}
                  </View>
                </View>
              ))
            : null}
        </View>
          </>
        )}
      </View>

      <CalendarDateModal
        visible={calendarNav !== null}
        title={calendarNav === "day" ? "Go to day" : "Go to week"}
        initialAt={calendarModalInitialAt}
        minDateYmd={minCalendarDateYmd}
        onCancel={() => setCalendarNav(null)}
        onConfirm={(endIso) => {
          const nav = calendarNav;
          const ymd = toLocalYmdFromIso(endIso);
          const parts = ymd.split("-").map(Number);
          const y = parts[0];
          const mo = parts[1];
          const d = parts[2];
          const localDay = new Date(y, mo - 1, d);
          const off = weekOffsetForContainingWeek(startOfThisWeek, localDay);
          setWeekOffset(Math.max(MIN_PAST_WEEKS, off));
          if (nav === "day") {
            setDayViewDate(new Date(y, mo - 1, d));
          } else {
            setDayViewDate(null);
          }
          setCalendarNav(null);
        }}
      />

      {/* Create Activity */}
      <AddActivityModal
        visible={addOpen}
        onClose={closeAddModal}
        onSave={handleSaveActivity}
        initialDateStr={
          duplicateFrom
            ? toLocalDateKey(new Date(duplicateFrom.start_at))
            : addModalInitialDateStr
        }
        mode="create"
        headerTitle={duplicateFrom ? "Duplicate activity" : undefined}
        submitLabel="Save"
        initial={
          duplicateFrom
            ? duplicateInitialFromActivity(duplicateFrom, effectiveMember?.id)
            : {
                participants_member_ids: effectiveMember?.id
                  ? [effectiveMember.id]
                  : [],
              }
        }
      />

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        visible={!!detailActivity}
        activity={detailActivity}
        onClose={() => setDetailActivity(null)}
        onApprove={(activity) => {
          if (activity.seriesOccurrence) {
            void (async () => {
              try {
                await patchActivitySeries(activity.seriesOccurrence!.seriesId, {
                  status: "APPROVED",
                  rejection_reason: null,
                });
                refreshCalendarData();
              } catch (e) {
                console.error(e);
              }
              setDetailActivity(null);
            })();
            return;
          }
          updateMut.mutate({ id: activity.id, patch: { status: "APPROVED" } });
          setDetailActivity(null);
        }}
        onReject={(activity, reason) => {
          if (activity.seriesOccurrence) {
            void (async () => {
              try {
                await patchActivitySeries(activity.seriesOccurrence!.seriesId, {
                  status: "NOT_APPROVED",
                  rejection_reason: reason.trim() ? reason.trim() : null,
                });
                refreshCalendarData();
              } catch (e) {
                console.error(e);
              }
              setDetailActivity(null);
            })();
            return;
          }
          updateMut.mutate({
            id: activity.id,
            patch: {
              status: "NOT_APPROVED",
              rejection_reason: reason.trim() ? reason.trim() : null,
            },
          });
          setDetailActivity(null);
        }}
        onRevertToPending={(activity) => {
          if (activity.seriesOccurrence) {
            void (async () => {
              try {
                await patchActivitySeries(activity.seriesOccurrence!.seriesId, {
                  status: "PENDING",
                  rejection_reason: null,
                });
                refreshCalendarData();
              } catch (e) {
                console.error(e);
              }
              setDetailActivity(null);
            })();
            return;
          }
          updateMut.mutate(
            { id: activity.id, patch: { status: "PENDING" } },
            {
              onSuccess: (updated) => {
                setDetailActivity(updated);
              },
            },
          );
        }}
        onDelete={(activity) => {
          if (activity.seriesOccurrence) {
            Alert.alert(
              "Delete recurring event",
              "What should be deleted?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "This event only",
                  onPress: () => {
                    void (async () => {
                      try {
                        await cancelSeriesOccurrence({
                          seriesId: activity.seriesOccurrence!.seriesId,
                          familyId: activeFamilyId!,
                          occurrenceStart: activity.seriesOccurrence!.occurrenceStart,
                        });
                        refreshCalendarData();
                      } catch (e) {
                        console.error(e);
                      }
                      setDetailActivity(null);
                    })();
                  },
                },
                {
                  text: "This and future events",
                  style: "destructive",
                  onPress: () => {
                    void (async () => {
                      try {
                        await truncateSeriesFromOccurrence({
                          seriesId: activity.seriesOccurrence!.seriesId,
                          occurrenceStart: activity.seriesOccurrence!.occurrenceStart,
                        });
                        refreshCalendarData();
                      } catch (e) {
                        console.error(e);
                      }
                      setDetailActivity(null);
                    })();
                  },
                },
              ],
            );
            return;
          }
          Alert.alert("Delete activity?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () =>
                deleteMut.mutate(
                  { id: activity.id },
                  { onSuccess: () => setDetailActivity(null) },
                ),
            },
          ]);
        }}
        onDuplicate={(activity) => {
          setDetailActivity(null);
          setDuplicateFrom(activity);
          setAddOpen(true);
        }}
        onEdit={(activity) => {
          if (activity.seriesOccurrence) {
            Alert.alert(
              "Edit recurring event",
              "What should be updated?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "This event only",
                  onPress: () => {
                    void (async () => {
                      setDetailActivity(null);
                      setEditingActivity(activity);
                      setSeriesEditScope("single");
                      setSeriesRecurrenceForEdit(undefined);
                      try {
                        const series = await fetchActivitySeriesById(
                          activity.seriesOccurrence!.seriesId,
                        );
                        setSeriesRecurrenceReadOnly(
                          series
                            ? normalizeRecurrenceRule(series.recurrence)
                            : null,
                        );
                      } catch {
                        setSeriesRecurrenceReadOnly(null);
                      }
                      setEditOpen(true);
                    })();
                  },
                },
                {
                  text: "This and future events",
                  onPress: () => {
                    void (async () => {
                      setDetailActivity(null);
                      setEditingActivity(activity);
                      setSeriesEditScope("forward");
                      setSeriesRecurrenceReadOnly(undefined);
                      try {
                        const series = await fetchActivitySeriesById(
                          activity.seriesOccurrence!.seriesId,
                        );
                        setSeriesRecurrenceForEdit(
                          series
                            ? normalizeRecurrenceRule(series.recurrence)
                            : null,
                        );
                      } catch {
                        setSeriesRecurrenceForEdit(null);
                      }
                      setEditOpen(true);
                    })();
                  },
                },
              ],
            );
            return;
          }
          setDetailActivity(null);
          setEditingActivity(activity);
          setSeriesEditScope(null);
          setSeriesRecurrenceReadOnly(undefined);
          setEditOpen(true);
        }}
        memberById={memberById}
        creatorName={creatorName}
        isParent={hasParentPermissions}
        isCreator={
          !!(
            detailActivity &&
            !detailActivity.isBirthday &&
            detailActivity.created_by?.id &&
            detailActivity.created_by.id === effectiveMember?.id
          )
        }
      />

      {/* Edit Activity */}
      {editingActivity ? (
        <AddActivityModal
          visible={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditingActivity(null);
            setSeriesEditScope(null);
            setSeriesRecurrenceForEdit(undefined);
            setSeriesRecurrenceReadOnly(undefined);
          }}
          onSave={handleUpdateActivity}
          initialDateStr={toLocalDateKey(new Date(editingActivity.start_at))}
          mode="edit"
          submitLabel="Update"
          initial={{
            title: editingActivity.title,
            start_at: editingActivity.start_at,
            end_at: editingActivity.end_at,
            location: editingActivity.location ?? undefined,
            money: editingActivity.money ?? undefined,
            ride_needed: !!editingActivity.ride_needed,
            present_needed: !!editingActivity.present_needed,
            babysitter_needed: !!editingActivity.babysitter_needed,
            participants_member_ids:
              editingActivity.participants?.map((p) => p.member_id) ?? [],
            notes: editingActivity.notes ?? undefined,
          }}
          seriesRecurrenceInitial={
            seriesEditScope === "forward" ? seriesRecurrenceForEdit : undefined
          }
          seriesRecurrenceReadOnly={
            seriesEditScope === "single" ? seriesRecurrenceReadOnly : undefined
          }
        />
      ) : null}
    </Screen>
  );

}

const styles = StyleSheet.create({

  /** Same horizontal inset as day view so chips / header don’t shift when switching. */
  /** Match Shop/Posts/Events breathing room below the Boards switcher. */
  center: { flex: 1, paddingLeft: 10, paddingRight: 10, paddingTop: 12, gap: 12 },
  /** Slightly tighter vertical gap between filter row and day timeline than week stack. */
  centerDayTimeline: { gap: 8 },

  headerExportBtn: {
    width: BOARD_NAV_BTN_SIZE,
    height: BOARD_NAV_BTN_SIZE,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },

  subtitle: { marginTop: 2, fontSize: 13, color: "#475569" },

  /** Fills space below sticky week header so only the day list scrolls. */
  weekScroll: { flex: 1, minHeight: 0 },
  weekListScrollContent: { paddingBottom: 100 },
  weekCaptureContent: { gap: 10 },
  weekExportStack: {
    width: "100%",
    backgroundColor: "#fff",
  },
  weekExportHeader: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  weekExportHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  weekExportHeaderSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 4,
  },
  weekExportHeaderPart: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 6,
  },
  /**
   * Off-screen clone for JPEG export. Keep full opacity: on Android, very low opacity + negative
   * z-index can prevent `react-native-view-shot` from capturing real pixels (blank / empty files).
   */
  weekExportHiddenHost: {
    position: "absolute",
    left: -8000,
    top: 0,
    opacity: 1,
    zIndex: 0,
  },

  dayRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    minHeight: 72,
  },
  dayRowToday: { borderColor: "#2563eb", backgroundColor: "#f8fbff" },
  dayHeader: {
    width: 84,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 4,
    position: "relative",
  },
  /** Corner hint: open full-day timeline (same tap target as the column). */
  dayHeaderExpandIcon: {
    position: "absolute",
    top: 6,
    right: 4,
  },
  dayName: { fontWeight: "700", color: "#334155" },
  dayNameToday: { color: "#2563eb" },
  dayDate: { fontSize: 13, color: "#64748b", marginTop: 2 },
  dayDateToday: { color: "#1d4ed8", fontWeight: "700" },
  dayContent: { flex: 1, padding: 10, justifyContent: "center" },
  placeholder: { color: "#94a3b8", fontStyle: "italic" },
  placeholderExport: {
    color: "#94a3b8",
    fontStyle: "italic",
    fontSize: 15,
  },

  itemRow: {
    flexDirection: "column",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 2,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  itemPending: {},
  itemLine1: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemTitle: {
    flex: 1,
    minWidth: 0,
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  itemTitleExport: {
    flex: 1,
    minWidth: 0,
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 17,
  },
  itemLine2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  itemTimeExport: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  itemLine2Spacer: {
    flex: 1,
    minWidth: 4,
  },
  badgeIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
});
