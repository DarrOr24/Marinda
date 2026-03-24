// Day agenda with hour grid (for activity board).
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BoardNavChevronButton } from "@/components/boards/activity-board-header-nav";
import type { Activity, ActivityStatus } from "@/lib/activities/activities.types";

const PX_PER_MINUTE = 1.35;
/** Space above the first visible block when scrolling to an activity. */
const SCROLL_TOP_MARGIN = 24;
/** First hour row shown (local time) */
export const TIMELINE_START_HOUR = 6;
/** Hour after which the grid ends (exclusive) */
export const TIMELINE_END_HOUR = 22;

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
};

function minutesSinceDayHour(day: Date, hour: number) {
  const t = new Date(day);
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

/** When the grid starts at midnight, scroll so ~6:00 is at the top; when it starts at 6, offset is 0. */
function scrollYToAnchorSixAm(): number {
  const deltaHours = 6 - TIMELINE_START_HOUR;
  if (deltaHours <= 0) return 0;
  return deltaHours * 60 * PX_PER_MINUTE;
}

function computeInitialScrollY(segments: DaySegment[]): number {
  if (segments.length > 0) {
    const minTop = Math.min(...segments.map((s) => s.top));
    return Math.max(0, minTop - SCROLL_TOP_MARGIN);
  }
  return scrollYToAnchorSixAm();
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

export function ActivityDayView({
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
}: Props) {
  const dayLabel = useMemo(
    () =>
      day.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
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
  const totalMinutes = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;
  const timelineHeight = totalMinutes * PX_PER_MINUTE;

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

  const layoutSegments = useMemo(() => {
    const raw = sortedForDay.map((activity) => {
      const startMs = new Date(activity.start_at).getTime();
      const endMs = new Date(activity.end_at).getTime();
      const segStart = Math.max(startMs, dayStartMs);
      const segEnd = Math.min(endMs, dayEndMs);
      const topMin = (segStart - dayStartMs) / 60000;
      const durMin = Math.max(12, (segEnd - segStart) / 60000);
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
    });
    return layoutOverlappingSegments(raw);
  }, [sortedForDay, dayStartMs, dayEndMs, timelineHeight]);

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let hh = TIMELINE_START_HOUR; hh < TIMELINE_END_HOUR; hh++) h.push(hh);
    return h;
  }, []);

  const dayKey = useMemo(() => {
    const d = new Date(day);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }, [day]);

  const scrollRef = useRef<ScrollView>(null);
  const prevDayKeyRef = useRef<string | null>(null);
  const prevSegLenRef = useRef(0);

  useLayoutEffect(() => {
    const dayChanged = prevDayKeyRef.current !== dayKey;
    const filledFromEmpty =
      prevSegLenRef.current === 0 && layoutSegments.length > 0;
    const firstMount = prevDayKeyRef.current === null;

    const shouldScroll = firstMount || dayChanged || filledFromEmpty;

    prevDayKeyRef.current = dayKey;
    prevSegLenRef.current = layoutSegments.length;

    if (!shouldScroll) return;

    const y = computeInitialScrollY(layoutSegments);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
  }, [dayKey, layoutSegments]);

  return (
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

        <Text style={styles.dayTitle} numberOfLines={2}>
          {dayLabel}
        </Text>

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

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        {sortedForDay.length === 0 ? (
          <Text style={styles.empty}>No activities this day</Text>
        ) : null}

        <View style={styles.timelineRow}>
          <View style={styles.hourLabels}>
            {hours.map((hh) => (
              <View
                key={hh}
                style={[
                  styles.hourLabelCell,
                  { height: 60 * PX_PER_MINUTE },
                ]}
              >
                <Text style={styles.hourLabelText}>
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
                  { top: (hh - TIMELINE_START_HOUR) * 60 * PX_PER_MINUTE },
                ]}
              />
            ))}

            {layoutSegments.map((seg, idx) => {
              const { activity, top, height, column, maxCol } = seg;
              const color = activityColor(activity);
              const base = activityColorStyle(activity.status, color);
              const leftPct = maxCol > 0 ? (column / maxCol) * 100 : 0;
              const widthPct = maxCol > 0 ? 100 / maxCol : 100;

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
      </ScrollView>
    </View>
  );
}

function formatHourLabel(h: number) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 4,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingRight: 4,
    flexShrink: 0,
  },
  weekBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
    paddingVertical: 4,
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
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 100 },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    fontStyle: "italic",
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  hourLabels: { width: 52 },
  hourLabelCell: {
    justifyContent: "flex-start",
    paddingTop: 0,
  },
  hourLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  gridWrap: {
    flex: 1,
    position: "relative",
    borderLeftWidth: 1,
    borderLeftColor: "#e2e8f0",
    paddingHorizontal: 4,
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
  blockTime: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },
});
