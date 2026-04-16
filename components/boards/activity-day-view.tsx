// Day agenda with hour grid (for activity board).
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  captureViewAsJpegAndShare,
  captureViewsAsJpegsAndShareTogether,
} from "@/lib/share/capture-scroll-jpeg";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { LayoutChangeEvent } from "react-native";
import {
  PixelRatio,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BoardNavChevronButton } from "@/components/boards/activity-board-header-nav";
import {
  EXPORT_PAGE_CONTENT_WIDTH,
  EXPORT_PAGE_HEIGHT,
} from "@/components/boards/export-page-layout";
import type { Activity, ActivityStatus } from "@/lib/activities/activities.types";

const PX_PER_MINUTE = 1.35;
/** Space above the first visible block when scrolling to an activity. */
const SCROLL_TOP_MARGIN = 24;
/** Full local day: midnight → next midnight (hour 24 exclusive = end of day). */
export const TIMELINE_START_HOUR = 0;
/** Hour after which the grid ends (exclusive). 24 = midnight next day. */
export const TIMELINE_END_HOUR = 24;
/** Overlapping columns won’t shrink below this % of the grid (readable cards; may clip if many overlap). */
const MIN_COLUMN_WIDTH_PCT = 24;
/** Treat segment as “all day” on this date if it covers local midnight through end-of-day (±1 min). */
const ALL_DAY_EDGE_TOLERANCE_MS = 60_000;
const DAY_EXPORT_MAX_PARTS = 12;

function localDayBoundsMs(day: Date) {
  const y = day.getFullYear();
  const m = day.getMonth();
  const d = day.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m, d, 23, 59, 59, 999).getTime();
  return { dayStartMs: start, dayEndMs: end };
}

/** True when this activity’s overlap with `day` is effectively the full local calendar day (Google-style “all day”). */
export function isActivityAllDayOnLocalDay(day: Date, a: Activity): boolean {
  const { dayStartMs, dayEndMs } = localDayBoundsMs(day);
  const startMs = new Date(a.start_at).getTime();
  const endMs = new Date(a.end_at).getTime();
  const segStart = Math.max(startMs, dayStartMs);
  const segEnd = Math.min(endMs, dayEndMs);
  if (segEnd <= segStart) return false;

  const coversStart = segStart <= dayStartMs + ALL_DAY_EDGE_TOLERANCE_MS;
  const coversEnd = segEnd >= dayEndMs - ALL_DAY_EDGE_TOLERANCE_MS;
  return coversStart && coversEnd;
}

export type ActivityDayViewExportHandle = {
  exportScheduleImages: (fileBaseName: string) => Promise<void>;
};

type Props = {
  day: Date;
  activities: Activity[];
  onClose: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  canPrevDay: boolean;
  canNextDay: boolean;
  onActivityPress: (a: Activity) => void;
  activityColor: (a: Activity) => string;
  activityColorStyle: (status: ActivityStatus, color: string) => {
    borderColor: string;
    backgroundColor: string;
  };
  formatTimeRange: (startIso: string, endIso: string) => string;
  /** Month picker: jump to a day (same as week header calendar). */
  onCalendarPress?: () => void;
  /** Export control placed before the day chevrons (matches week header). */
  topBarEndAccessory?: React.ReactNode;
};

function minutesSinceDayHour(day: Date, hour: number) {
  const t = new Date(day);
  // hour 24 rolls to next calendar day 00:00 (end-of-day boundary)
  t.setHours(hour, 0, 0, 0);
  return t.getTime();
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function intervalsOverlap(
  a: { segStart: number; segEnd: number },
  b: { segStart: number; segEnd: number },
) {
  return a.segStart < b.segEnd && a.segEnd > b.segStart;
}

type DaySegment = {
  activity: Activity;
  segStart: number;
  segEnd: number;
  top: number;
  height: number;
  column: number;
  maxCol: number;
};

/**
 * When the visible grid starts before 6:00, scroll so ~6:00 is near the top; when the grid starts at 9:00
 * or later, keep y=0 (no dead space above the first labeled hour).
 */
function scrollYToAnchorForGrid(gridStartHour: number): number {
  const targetAnchorHour = 6;
  const deltaHours = targetAnchorHour - gridStartHour;
  if (deltaHours <= 0) return 0;
  return deltaHours * 60 * PX_PER_MINUTE;
}

function computeInitialScrollY(
  segments: DaySegment[],
  gridStartHour: number,
): number {
  if (segments.length > 0) {
    const minTop = Math.min(...segments.map((s) => s.top));
    return Math.max(0, minTop - SCROLL_TOP_MARGIN);
  }
  return scrollYToAnchorForGrid(gridStartHour);
}

function layoutOverlappingSegments(
  items: Omit<DaySegment, "column" | "maxCol">[],
): DaySegment[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    if (a.segStart !== b.segStart) return a.segStart - b.segStart;
    if (a.segEnd !== b.segEnd) return b.segEnd - a.segEnd;
    return a.activity.id.localeCompare(b.activity.id);
  });

  const column = new Map<string, number>();
  let active: typeof sorted = [];

  for (const item of sorted) {
    active = active.filter((p) => p.segEnd > item.segStart);
    const used = new Set(active.map((p) => column.get(p.activity.id)!));
    let c = 0;
    while (used.has(c)) c += 1;
    column.set(item.activity.id, c);
    active.push(item);
  }

  return sorted.map((item) => {
    let maxCol = 0;
    for (const o of sorted) {
      if (!intervalsOverlap(item, o)) continue;
      maxCol = Math.max(maxCol, column.get(o.activity.id)! + 1);
    }
    return {
      ...item,
      column: column.get(item.activity.id)!,
      maxCol,
    };
  });
}

/** Split [gridStartHour, endHourExclusive) into `parts` contiguous hour ranges (equal sizes when possible). */
function equalHourSliceRanges(
  gridStartHour: number,
  endHourExclusive: number,
  parts: number,
): { chunkStart: number; chunkEnd: number }[] {
  const nHours = endHourExclusive - gridStartHour;
  if (nHours <= 0) {
    return [{ chunkStart: gridStartHour, chunkEnd: endHourExclusive }];
  }
  if (parts <= 1) {
    return [{ chunkStart: gridStartHour, chunkEnd: endHourExclusive }];
  }
  const n = Math.min(parts, nHours);
  if (n <= 1) {
    return [{ chunkStart: gridStartHour, chunkEnd: endHourExclusive }];
  }
  const base = Math.floor(nHours / n);
  const rem = nHours % n;
  const out: { chunkStart: number; chunkEnd: number }[] = [];
  let h = gridStartHour;
  for (let p = 0; p < n; p++) {
    const sz = base + (p < rem ? 1 : 0);
    out.push({ chunkStart: h, chunkEnd: h + sz });
    h += sz;
  }
  return out;
}

/**
 * Packs **as many early hours as fit** in each export page before splitting, instead of dividing
 * the day into equal hour counts (which cuts busy afternoons in the middle).
 */
function greedyDayExportHourRanges(
  gridStartHour: number,
  gridEndHourExclusive: number,
  partCount: number,
  pageHeightPx: number,
  firstChunkHasAllDay: boolean,
): { chunkStart: number; chunkEnd: number }[] {
  const totalHours = gridEndHourExclusive - gridStartHour;
  if (partCount <= 1 || totalHours <= 0) {
    return [{ chunkStart: gridStartHour, chunkEnd: gridEndHourExclusive }];
  }

  const hourPx = 60 * PX_PER_MINUTE;
  const overheadFirst = 240 + (firstChunkHasAllDay ? 150 : 0);
  const overheadRest = 200;

  const ranges: { chunkStart: number; chunkEnd: number }[] = [];
  let cursor = gridStartHour;

  for (let p = 0; p < partCount; p++) {
    const hoursLeft = gridEndHourExclusive - cursor;
    const partsLeft = partCount - p;
    if (hoursLeft <= 0) break;

    if (partsLeft === 1) {
      ranges.push({ chunkStart: cursor, chunkEnd: gridEndHourExclusive });
      break;
    }

    const overhead = p === 0 ? overheadFirst : overheadRest;
    const timelineBudget = Math.max(hourPx, pageHeightPx - overhead);
    let take = Math.floor(timelineBudget / hourPx);
    take = Math.min(take, hoursLeft - (partsLeft - 1));
    take = Math.max(1, take);

    const next = cursor + take;
    ranges.push({ chunkStart: cursor, chunkEnd: next });
    cursor = next;
  }

  if (ranges.length !== partCount) {
    return equalHourSliceRanges(gridStartHour, gridEndHourExclusive, partCount);
  }
  return ranges;
}

function buildLayoutSegmentsForChunk(
  timedActivities: Activity[],
  day: Date,
  dayStartMs: number,
  dayEndMs: number,
  chunkStartHour: number,
  chunkEndHourExclusive: number,
): DaySegment[] {
  const gridStartMs = minutesSinceDayHour(day, chunkStartHour);
  const chunkEndMs = minutesSinceDayHour(day, chunkEndHourExclusive);
  const timelineHeight =
    (chunkEndHourExclusive - chunkStartHour) * 60 * PX_PER_MINUTE;

  const raw = timedActivities
    .map((activity) => {
      const startMs = new Date(activity.start_at).getTime();
      const endMs = new Date(activity.end_at).getTime();
      const segStart = Math.max(startMs, dayStartMs);
      const segEnd = Math.min(endMs, dayEndMs);
      if (segEnd <= segStart) return null;

      const visStart = Math.max(segStart, gridStartMs);
      const visEnd = Math.min(segEnd, chunkEndMs);
      if (visEnd <= visStart) return null;

      const topMin = (visStart - gridStartMs) / 60000;
      const durMin = Math.max(12, (visEnd - visStart) / 60000);
      const top = clamp(
        topMin * PX_PER_MINUTE,
        0,
        timelineHeight - 32,
      );
      const height = clamp(
        durMin * PX_PER_MINUTE,
        32,
        timelineHeight - top,
      );
      return { activity, segStart, segEnd, top, height };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  return layoutOverlappingSegments(raw);
}

/** Default timed grid in export when there are no timed events (9 AM–11 PM). */
const EXPORT_FALLBACK_START_HOUR = 9;
const EXPORT_FALLBACK_END_HOUR_EXCLUSIVE = 24;
const EXPORT_PAD_MS = 60 * 60 * 1000;
/** Sparse days: widen the timed grid to at least this many hour rows (symmetric expansion). */
const MIN_EXPORT_TIMED_HOUR_SPAN = 9;

/**
 * If the padded window spans fewer than `minHours` hour rows, grow it by adding hours
 * left/right of the current range (as evenly as possible), clamped to [0, 24].
 */
function applyMinimumExportHourSpan(
  startHour: number,
  endHourExclusive: number,
  minHours: number,
): { exportGridStartHour: number; exportGridEndHourExclusive: number } {
  let span = endHourExclusive - startHour;
  if (span >= minHours) {
    return {
      exportGridStartHour: startHour,
      exportGridEndHourExclusive: endHourExclusive,
    };
  }

  const deficit = minHours - span;
  const expandLeft = Math.floor(deficit / 2);
  const expandRight = deficit - expandLeft;

  let ns = startHour - expandLeft;
  let ne = endHourExclusive + expandRight;

  if (ns < 0) {
    ne -= ns;
    ns = 0;
  }
  if (ne > 24) {
    ns -= ne - 24;
    ne = 24;
  }
  if (ns < 0) {
    ns = 0;
  }

  return {
    exportGridStartHour: ns,
    exportGridEndHourExclusive: ne,
  };
}

/**
 * JPEG export only: timed grid is first timed start − 1h through last timed end + 1h (local day),
 * clamped to the calendar day; then widened to at least {@link MIN_EXPORT_TIMED_HOUR_SPAN} if needed.
 * All-day / birthdays stay in their own strip above in the export tree.
 * With no timed events → 9:00–23:00 hour rows (same as legacy empty default).
 */
function deriveExportDayHourRange(
  day: Date,
  timedActivities: Activity[],
  dayStartMs: number,
  dayEndMs: number,
): { exportGridStartHour: number; exportGridEndHourExclusive: number } {
  if (timedActivities.length === 0) {
    return {
      exportGridStartHour: EXPORT_FALLBACK_START_HOUR,
      exportGridEndHourExclusive: EXPORT_FALLBACK_END_HOUR_EXCLUSIVE,
    };
  }

  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const a of timedActivities) {
    const s = new Date(a.start_at).getTime();
    const e = new Date(a.end_at).getTime();
    minStart = Math.min(minStart, s);
    maxEnd = Math.max(maxEnd, e);
  }

  const startPaddedMs = Math.max(dayStartMs, minStart - EXPORT_PAD_MS);
  const endPaddedMs = Math.min(dayEndMs - 1, maxEnd + EXPORT_PAD_MS);

  const exportGridStartHour = clamp(
    Math.floor((startPaddedMs - dayStartMs) / 3_600_000),
    0,
    23,
  );

  const gridStartMsExport = minutesSinceDayHour(day, exportGridStartHour);
  const spanMs = Math.max(0, endPaddedMs - gridStartMsExport);
  const hourSpan = Math.max(1, Math.ceil(spanMs / 3_600_000));
  const exportGridEndHourExclusive = Math.min(
    24,
    Math.max(exportGridStartHour + 1, exportGridStartHour + hourSpan),
  );

  return applyMinimumExportHourSpan(
    exportGridStartHour,
    exportGridEndHourExclusive,
    MIN_EXPORT_TIMED_HOUR_SPAN,
  );
}

export const ActivityDayView = forwardRef<
  ActivityDayViewExportHandle,
  Props
>(function ActivityDayView(
  {
  day,
  activities,
  onClose,
  onPrevDay,
  onNextDay,
  canPrevDay,
  canNextDay,
  onActivityPress,
  activityColor,
  activityColorStyle,
  formatTimeRange,
  onCalendarPress,
  topBarEndAccessory,
}: Props,
  ref,
) {
  /** Short weekday + month avoids a two-line title and layout jumps (e.g. Tue, Mar 24). */
  const dayLabel = useMemo(
    () =>
      day.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [day],
  );

  const dayTitleA11yLabel = useMemo(
    () =>
      day.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [day],
  );

  const dayExportScheduleTitle = useMemo(
    () =>
      `${day.toLocaleDateString(undefined, { weekday: "long" })} schedule`,
    [day],
  );

  const dayExportCalendarLine = useMemo(
    () =>
      day.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [day],
  );

  const dayStartMs = useMemo(
    () => minutesSinceDayHour(day, TIMELINE_START_HOUR),
    [day],
  );
  const dayEndMs = useMemo(
    () => minutesSinceDayHour(day, TIMELINE_END_HOUR),
    [day],
  );

  const sortedForDay = useMemo(() => {
    return [...activities]
      .filter((a) => {
        const endMs = new Date(a.end_at).getTime();
        const startMs = new Date(a.start_at).getTime();
        const segStart = Math.max(startMs, dayStartMs);
        const segEnd = Math.min(endMs, dayEndMs);
        return segEnd > segStart;
      })
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      );
  }, [activities, dayStartMs, dayEndMs]);

  const allDayActivities = useMemo(
    () => sortedForDay.filter((a) => isActivityAllDayOnLocalDay(day, a)),
    [sortedForDay, day],
  );

  const timedActivities = useMemo(
    () =>
      sortedForDay.filter((a) => !isActivityAllDayOnLocalDay(day, a)),
    [sortedForDay, day],
  );

  /** Earliest of 9:00 local or the local hour of the first timed event (empty day → 9). */
  const gridStartHour = useMemo(() => {
    if (timedActivities.length === 0) return 9;
    let earliest = timedActivities[0]!;
    for (const a of timedActivities) {
      if (new Date(a.start_at) < new Date(earliest.start_at)) earliest = a;
    }
    return Math.min(9, new Date(earliest.start_at).getHours());
  }, [timedActivities]);

  const gridStartMs = useMemo(
    () => minutesSinceDayHour(day, gridStartHour),
    [day, gridStartHour],
  );

  const totalMinutes = (TIMELINE_END_HOUR - gridStartHour) * 60;
  const timelineHeight = totalMinutes * PX_PER_MINUTE;

  const layoutSegments = useMemo(() => {
    const raw = timedActivities
      .map((activity) => {
        const startMs = new Date(activity.start_at).getTime();
        const endMs = new Date(activity.end_at).getTime();
        const segStart = Math.max(startMs, dayStartMs);
        const segEnd = Math.min(endMs, dayEndMs);
        if (segEnd <= segStart) return null;

        const visStart = Math.max(segStart, gridStartMs);
        const visEnd = segEnd;
        if (visEnd <= visStart) return null;

        const topMin = (visStart - gridStartMs) / 60000;
        const durMin = Math.max(12, (visEnd - visStart) / 60000);
        const top = clamp(
          topMin * PX_PER_MINUTE,
          0,
          timelineHeight - 32,
        );
        const height = clamp(
          durMin * PX_PER_MINUTE,
          32,
          timelineHeight - top,
        );
        return { activity, segStart, segEnd, top, height };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    return layoutOverlappingSegments(raw);
  }, [
    timedActivities,
    dayStartMs,
    dayEndMs,
    gridStartMs,
    timelineHeight,
  ]);

  const { exportGridStartHour, exportGridEndHourExclusive } = useMemo(
    () => deriveExportDayHourRange(day, timedActivities, dayStartMs, dayEndMs),
    [day, timedActivities, dayStartMs, dayEndMs],
  );

  const layoutSegmentsForExport = useMemo(
    () =>
      buildLayoutSegmentsForChunk(
        timedActivities,
        day,
        dayStartMs,
        dayEndMs,
        exportGridStartHour,
        exportGridEndHourExclusive,
      ),
    [
      timedActivities,
      day,
      dayStartMs,
      dayEndMs,
      exportGridStartHour,
      exportGridEndHourExclusive,
    ],
  );

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let hh = gridStartHour; hh < TIMELINE_END_HOUR; hh++) h.push(hh);
    return h;
  }, [gridStartHour]);

  /** Wide enough for the longest localized hour label on one line; scales with accessibility font size. */
  const timeGutterMinWidth = useMemo(() => timeGutterMinWidthPx(), []);

  const dayKey = useMemo(() => {
    const d = new Date(day);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }, [day]);

  const scrollRef = useRef<ScrollView>(null);
  const prevDayKeyRef = useRef<string | null>(null);
  const prevSegLenRef = useRef(0);
  const prevAllDayHeightForScroll = useRef(-1);
  const [allDayBlockHeight, setAllDayBlockHeight] = useState(0);

  const dayExportContentWidth = EXPORT_PAGE_CONTENT_WIDTH;
  const dayExportMaxChunkHeight = EXPORT_PAGE_HEIGHT;

  const dayExportFullRef = useRef<View>(null);
  const dayExportFullHeightRef = useRef(0);
  const dayExportChunkRefs = useRef<(View | null)[]>([]);
  const [dayExportPartCount, setDayExportPartCount] = useState(1);

  useEffect(() => {
    if (allDayActivities.length === 0) setAllDayBlockHeight(0);
  }, [allDayActivities.length]);

  useEffect(() => {
    setDayExportPartCount(1);
  }, [dayKey]);

  function assignScrollRef(node: ScrollView | null) {
    scrollRef.current = node;
  }

  function onAllDayLayout(e: LayoutChangeEvent) {
    setAllDayBlockHeight(e.nativeEvent.layout.height);
  }

  useLayoutEffect(() => {
    const dayChanged = prevDayKeyRef.current !== dayKey;
    if (dayChanged) prevAllDayHeightForScroll.current = -1;

    const filledFromEmpty =
      prevSegLenRef.current === 0 && layoutSegments.length > 0;
    const firstMount = prevDayKeyRef.current === null;
    const allDayMeasured =
      allDayActivities.length > 0 && allDayBlockHeight > 0;
    const allDayLayoutTick =
      allDayMeasured && prevAllDayHeightForScroll.current !== allDayBlockHeight;

    const shouldScroll =
      firstMount || dayChanged || filledFromEmpty || allDayLayoutTick;

    prevDayKeyRef.current = dayKey;
    prevSegLenRef.current = layoutSegments.length;

    if (!shouldScroll) return;

    prevAllDayHeightForScroll.current = allDayBlockHeight;

    const y =
      allDayBlockHeight + computeInitialScrollY(layoutSegments, gridStartHour);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
  }, [
    dayKey,
    layoutSegments,
    allDayBlockHeight,
    allDayActivities.length,
    gridStartHour,
  ]);

  const dayExportHourRanges = useMemo(() => {
    if (dayExportPartCount <= 1) return [];
    return greedyDayExportHourRanges(
      exportGridStartHour,
      exportGridEndHourExclusive,
      dayExportPartCount,
      dayExportMaxChunkHeight,
      allDayActivities.length > 0,
    );
  }, [
    exportGridStartHour,
    exportGridEndHourExclusive,
    dayExportPartCount,
    dayExportMaxChunkHeight,
    allDayActivities.length,
  ]);

  const exportChunkSegments = useMemo(() => {
    return dayExportHourRanges.map(({ chunkStart, chunkEnd }) =>
      buildLayoutSegmentsForChunk(
        timedActivities,
        day,
        dayStartMs,
        dayEndMs,
        chunkStart,
        chunkEnd,
      ),
    );
  }, [dayExportHourRanges, timedActivities, day, dayStartMs, dayEndMs]);

  useImperativeHandle(
    ref,
    () => ({
      async exportScheduleImages(fileBaseName: string) {
        await new Promise((r) => setTimeout(r, 32));
        const n = dayExportPartCount;
        if (n <= 1) {
          if (!dayExportFullRef.current) {
            throw new Error("Day export is not ready yet.");
          }
          await captureViewAsJpegAndShare(dayExportFullRef, fileBaseName);
          return;
        }
        const steps: { viewRef: RefObject<View | null>; fileBaseName: string }[] =
          [];
        for (let i = 0; i < n; i++) {
          const idx = i;
          steps.push({
            viewRef: {
              get current() {
                return dayExportChunkRefs.current[idx] ?? null;
              },
            },
            fileBaseName: `${fileBaseName}_${i + 1}`,
          });
        }
        await captureViewsAsJpegsAndShareTogether(steps);
      },
    }),
    [dayExportPartCount],
  );

  function renderExportHeader(partIndex?: number, partCount?: number) {
    return (
      <View style={styles.exportImageHeader}>
        <Text style={styles.exportImageTitle}>{dayExportScheduleTitle}</Text>
        <Text style={styles.exportImageSubtitle}>{dayExportCalendarLine}</Text>
        {partIndex != null && partCount != null && partCount > 1 ? (
          <Text style={styles.exportImagePartHint}>
            Part {partIndex} of {partCount}
          </Text>
        ) : null}
      </View>
    );
  }

  function renderAllDayForExport(readable: boolean) {
    if (allDayActivities.length === 0) return null;
    const labelStyle = readable
      ? [styles.allDayLabelText, styles.allDayLabelTextExport]
      : styles.allDayLabelText;
    const titleStyle = readable
      ? [styles.allDayCardTitle, styles.allDayCardTitleExport]
      : styles.allDayCardTitle;
    const metaStyle = readable
      ? [styles.allDayCardMeta, styles.allDayCardMetaExport]
      : styles.allDayCardMeta;
    const iconSz = readable ? 18 : 16;

    return (
      <View style={styles.allDaySection}>
        <View style={styles.allDayRowLayout}>
          <View
            style={[styles.allDayLabelCol, { minWidth: timeGutterMinWidth }]}
          >
            <Text style={labelStyle}>All-day</Text>
          </View>
          <View style={styles.allDayList}>
            {allDayActivities.map((a) => {
              const color = activityColor(a);
              const base = activityColorStyle(a.status, color);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => onActivityPress(a)}
                  style={[styles.allDayCard, base]}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.title}, all day`}
                >
                  <View style={styles.allDayCardTitleRow}>
                    {a.isBirthday ? (
                      <MaterialCommunityIcons
                        name="cake-variant"
                        size={iconSz}
                        color={color}
                        style={styles.allDayCakeIcon}
                      />
                    ) : null}
                    <Text numberOfLines={2} style={titleStyle}>
                      {a.title}
                    </Text>
                  </View>
                  <Text style={metaStyle} numberOfLines={1}>
                    {a.isBirthday
                      ? "All day"
                      : formatTimeRange(a.start_at, a.end_at)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  function renderEmptyDayForExport(readable: boolean, onlyIfFirstChunk: boolean) {
    if (!onlyIfFirstChunk) return null;
    if (sortedForDay.length > 0 || allDayActivities.length > 0) return null;
    return (
      <Text style={[styles.empty, readable && styles.emptyExport]}>
        No activities this day
      </Text>
    );
  }

  function renderTimelineForExport(
    chunkStartHour: number,
    chunkEndHourExclusive: number,
    segments: DaySegment[],
    readable: boolean,
  ) {
    const chunkHours: number[] = [];
    for (let hh = chunkStartHour; hh < chunkEndHourExclusive; hh++) {
      chunkHours.push(hh);
    }
    const chunkTimelineHeight =
      (chunkEndHourExclusive - chunkStartHour) * 60 * PX_PER_MINUTE;
    const hourTextStyle = readable
      ? [styles.hourLabelText, styles.hourLabelTextExport]
      : styles.hourLabelText;
    const blockTitleStyle = readable
      ? [styles.blockTitle, styles.blockTitleExport]
      : styles.blockTitle;
    const blockTimeStyle = readable
      ? [styles.blockTime, styles.blockTimeExport]
      : styles.blockTime;

    return (
      <View style={styles.timelineRow}>
        <View style={[styles.hourLabels, { minWidth: timeGutterMinWidth }]}>
          {chunkHours.map((hh) => (
            <View
              key={hh}
              style={[
                styles.hourLabelCell,
                { height: 60 * PX_PER_MINUTE },
              ]}
            >
              <Text style={hourTextStyle} numberOfLines={1}>
                {formatHourLabel(hh)}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.gridWrap, { minHeight: chunkTimelineHeight }]}>
          {chunkHours.map((hh) => (
            <View
              key={hh}
              style={[
                styles.gridLine,
                {
                  top: (hh - chunkStartHour) * 60 * PX_PER_MINUTE,
                },
              ]}
            />
          ))}

          {segments.map((seg, idx) => {
            const { activity, top, height, column, maxCol } = seg;
            const color = activityColor(activity);
            const base = activityColorStyle(activity.status, color);
            const leftPct = maxCol > 0 ? (column / maxCol) * 100 : 0;
            const widthPct =
              maxCol > 0
                ? Math.max(100 / maxCol, MIN_COLUMN_WIDTH_PCT)
                : 100;

            return (
              <Pressable
                key={`${activity.id}-${chunkStartHour}-${idx}`}
                onPress={() => onActivityPress(activity)}
                style={[
                  styles.block,
                  base,
                  {
                    top,
                    height,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    zIndex: idx + 1 + column,
                  },
                ]}
              >
                <Text numberOfLines={2} style={blockTitleStyle}>
                  {activity.title}
                </Text>
                <Text style={blockTimeStyle}>
                  {formatTimeRange(activity.start_at, activity.end_at)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <>
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onClose}
          style={styles.weekBackBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to week view"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="chevron-left" size={18} color="#2563eb" />
          <Text style={styles.weekBackText}>Week</Text>
        </Pressable>

        {onCalendarPress ? (
          <Pressable
            onPress={onCalendarPress}
            style={styles.dayTitleWithCalendar}
            accessibilityRole="button"
            accessibilityLabel={`${dayTitleA11yLabel}. Choose date, opens calendar`}
          >
            <Text style={styles.dayTitleText} numberOfLines={1}>
              {dayLabel}
            </Text>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={20}
              color="#2563eb"
              style={styles.dayCalendarIcon}
            />
          </Pressable>
        ) : (
          <Text
            style={styles.dayTitle}
            numberOfLines={1}
            accessibilityLabel={dayTitleA11yLabel}
          >
            {dayLabel}
          </Text>
        )}

        {topBarEndAccessory ? (
          <View style={styles.topBarAccessorySlot}>{topBarEndAccessory}</View>
        ) : null}

        <View style={styles.dayNav}>
          <BoardNavChevronButton
            direction="left"
            disabled={!canPrevDay}
            onPress={onPrevDay}
            accessibilityLabel="Previous day"
          />
          <BoardNavChevronButton
            direction="right"
            disabled={!canNextDay}
            onPress={onNextDay}
            accessibilityLabel="Next day"
          />
        </View>
      </View>

      <View style={styles.dayBody} collapsable={false}>
        <ScrollView
          ref={assignScrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          collapsable={false}
        >
        <View collapsable={false}>
        {allDayActivities.length > 0 ? (
          <View style={styles.allDaySection} onLayout={onAllDayLayout}>
            <View style={styles.allDayRowLayout}>
              <View
                style={[styles.allDayLabelCol, { minWidth: timeGutterMinWidth }]}
              >
                <Text style={styles.allDayLabelText}>All-day</Text>
              </View>
              <View style={styles.allDayList}>
                {allDayActivities.map((a) => {
                  const color = activityColor(a);
                  const base = activityColorStyle(a.status, color);
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => onActivityPress(a)}
                      style={[styles.allDayCard, base]}
                      accessibilityRole="button"
                      accessibilityLabel={`${a.title}, all day`}
                    >
                      <View style={styles.allDayCardTitleRow}>
                        {a.isBirthday ? (
                          <MaterialCommunityIcons
                            name="cake-variant"
                            size={16}
                            color={color}
                            style={styles.allDayCakeIcon}
                          />
                        ) : null}
                        <Text numberOfLines={2} style={styles.allDayCardTitle}>
                          {a.title}
                        </Text>
                      </View>
                      <Text style={styles.allDayCardMeta} numberOfLines={1}>
                        {a.isBirthday
                          ? "All day"
                          : formatTimeRange(a.start_at, a.end_at)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}

        {sortedForDay.length === 0 && allDayActivities.length === 0 ? (
          <Text style={styles.empty}>No activities this day</Text>
        ) : null}

        <View style={styles.timelineRow}>
          <View style={[styles.hourLabels, { minWidth: timeGutterMinWidth }]}>
            {hours.map((hh) => (
              <View
                key={hh}
                style={[
                  styles.hourLabelCell,
                  { height: 60 * PX_PER_MINUTE },
                ]}
              >
                <Text style={styles.hourLabelText} numberOfLines={1}>
                  {formatHourLabel(hh)}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.gridWrap, { minHeight: timelineHeight }]}>
            {hours.map((hh) => (
              <View
                key={hh}
                style={[
                  styles.gridLine,
                  { top: (hh - gridStartHour) * 60 * PX_PER_MINUTE },
                ]}
              />
            ))}

            {layoutSegments.map((seg, idx) => {
              const { activity, top, height, column, maxCol } = seg;
              const color = activityColor(activity);
              const base = activityColorStyle(activity.status, color);
              const leftPct = maxCol > 0 ? (column / maxCol) * 100 : 0;
              const widthPct =
                maxCol > 0
                  ? Math.max(100 / maxCol, MIN_COLUMN_WIDTH_PCT)
                  : 100;

              return (
                <Pressable
                  key={activity.id}
                  onPress={() => onActivityPress(activity)}
                  style={[
                    styles.block,
                    base,
                    {
                      top,
                      height,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      zIndex: idx + 1 + column,
                    },
                  ]}
                >
                  <Text numberOfLines={2} style={styles.blockTitle}>
                    {activity.title}
                  </Text>
                  <Text style={styles.blockTime}>
                    {formatTimeRange(activity.start_at, activity.end_at)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        </View>
        </ScrollView>
      </View>
    </View>

    <View
      style={[
        styles.dayExportHiddenHost,
        { width: dayExportContentWidth },
      ]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
    >
      <View
        ref={dayExportFullRef}
        collapsable={false}
        renderToHardwareTextureAndroid={false}
        onLayout={(e) => {
          const H = e.nativeEvent.layout.height;
          dayExportFullHeightRef.current = H;
          const maxH = dayExportMaxChunkHeight;
          const nextN =
            H <= maxH || H === 0
              ? 1
              : Math.min(
                  DAY_EXPORT_MAX_PARTS,
                  Math.ceil(H / maxH),
                );
          setDayExportPartCount((prev) => (prev !== nextN ? nextN : prev));
        }}
        style={styles.dayExportStack}
      >
        {renderExportHeader()}
        {renderAllDayForExport(true)}
        {renderEmptyDayForExport(true, true)}
        {renderTimelineForExport(
          exportGridStartHour,
          exportGridEndHourExclusive,
          layoutSegmentsForExport,
          true,
        )}
      </View>

      {dayExportPartCount > 1
        ? dayExportHourRanges.map(({ chunkStart, chunkEnd }, i) => (
            <View
              key={`day-export-${chunkStart}-${chunkEnd}`}
              ref={(node) => {
                dayExportChunkRefs.current[i] = node;
              }}
              collapsable={false}
              renderToHardwareTextureAndroid={false}
              style={styles.dayExportStack}
            >
              {renderExportHeader(i + 1, dayExportPartCount)}
              {i === 0 ? renderAllDayForExport(true) : null}
              {i === 0 ? renderEmptyDayForExport(true, true) : null}
              {renderTimelineForExport(
                chunkStart,
                chunkEnd,
                exportChunkSegments[i] ?? [],
                true,
              )}
            </View>
          ))
        : null}
    </View>
    </>
  );
});

function formatHourLabel(h: number) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Derives gutter width from the longest hour string for the current locale (~px tallies for 11px semibold).
 * Keeps “10:00 a.m.” style strings on one line without hard-coding 52px.
 */
function timeGutterMinWidthPx(): number {
  const fontScale = PixelRatio.getFontScale();
  let widest = "All-day";
  for (let hh = TIMELINE_START_HOUR; hh < TIMELINE_END_HOUR; hh++) {
    const label = formatHourLabel(hh);
    if (label.length > widest.length) widest = label;
  }
  const approxCharPx = 7;
  const estimated = Math.ceil(widest.length * approxCharPx * fontScale + 12 * fontScale);
  return Math.min(200, Math.max(Math.ceil(72 * fontScale), estimated));
}

const styles = StyleSheet.create({
  /**
   * Horizontal inset comes from `activity-board` `styles.center` (10pt), same as the week list.
   * Avoid padding here so day mode is not doubly inset vs week mode.
   */
  root: {
    flex: 1,
    minHeight: 0,
    paddingTop: 4,
  },
  /** Included in share JPEG only (same tree as scroll content). */
  exportImageHeader: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  exportImageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  exportImageSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 4,
  },
  exportImagePartHint: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 6,
  },
  /**
   * Off-screen clone for JPEG export. Keep full opacity: on Android, very low opacity + negative
   * z-index can prevent `react-native-view-shot` from capturing real pixels (blank / empty files).
   */
  dayExportHiddenHost: {
    position: "absolute",
    left: -8000,
    top: 0,
    opacity: 1,
    zIndex: 0,
  },
  dayExportStack: {
    width: "100%",
    backgroundColor: "#fff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    flexShrink: 0,
  },
  weekBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    paddingVertical: 4,
    paddingRight: 6,
    marginLeft: 0,
    maxWidth: "36%",
  },
  weekBackText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563eb",
  },
  dayTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  dayTitleWithCalendar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 48,
    paddingHorizontal: 6,
    overflow: "visible",
  },
  dayTitleText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    minWidth: 0,
  },
  dayCalendarIcon: {
    flexShrink: 0,
  },
  topBarAccessorySlot: {
    justifyContent: "center",
    flexShrink: 0,
  },
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    marginRight: -2,
  },
  dayBody: {
    flex: 1,
    minHeight: 0,
    flexDirection: "column",
  },
  allDaySection: {
    flexShrink: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 0,
  },
  allDayRowLayout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  allDayLabelCol: {
    flexShrink: 0,
    paddingTop: 6,
    alignItems: "flex-start",
  },
  allDayLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "left",
    lineHeight: 13,
  },
  allDayLabelTextExport: {
    fontSize: 11,
  },
  allDayList: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  allDayCard: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  allDayCardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  allDayCakeIcon: {
    marginTop: 1,
  },
  allDayCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    minWidth: 0,
  },
  allDayCardTitleExport: {
    fontSize: 15,
  },
  allDayCardMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },
  allDayCardMetaExport: {
    fontSize: 13,
  },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 100 },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    fontStyle: "italic",
    marginBottom: 12,
  },
  emptyExport: {
    fontSize: 15,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  hourLabels: {
    flexShrink: 0,
    alignItems: "flex-start",
  },
  hourLabelCell: {
    justifyContent: "flex-start",
    paddingTop: 0,
    width: "100%",
  },
  hourLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  hourLabelTextExport: {
    fontSize: 12,
  },
  gridWrap: {
    flex: 1,
    position: "relative",
    borderLeftWidth: 1,
    borderLeftColor: "#e2e8f0",
    /** Match day header `dayNav` (`marginRight: -2`): card border aligns with chevron tiles. */
    paddingLeft: 4,
    paddingRight: 0,
    marginRight: -2,
    overflow: "hidden",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  block: {
    position: "absolute",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    overflow: "hidden",
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  blockTitleExport: {
    fontSize: 14,
  },
  blockTime: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },
  blockTimeExport: {
    fontSize: 12,
  },
});
