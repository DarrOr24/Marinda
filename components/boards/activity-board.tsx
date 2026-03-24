// app/boards/activity.tsx
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ActivityBoardHeaderNav } from "@/components/boards/activity-board-header-nav";
import { ActivityDayView } from "@/components/boards/activity-day-view";
import { ActivityDetailModal } from "@/components/modals/activity-detail-modal";
import AddActivityModal, { type NewActivityForm } from "@/components/modals/add-activity-modal";
import { Button, SafeFab, Screen } from "@/components/ui";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  useCreateActivity,
  useDeleteActivity,
  useFamilyActivities,
  useUpdateActivity,
} from "@/lib/activities/activities.hooks";
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
  ActivityStatus,
} from "@/lib/activities/activities.types";
import { useFamily } from "@/lib/families/families.hooks";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MIN_PAST_WEEKS = -4;

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

export default function ActivityBoard() {
  const today = new Date();
  const { effectiveMember, activeFamilyId, hasParentPermissions } = useAuthContext() as any;
  const { familyMembers } = useFamily(activeFamilyId);

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [addOpen, setAddOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  /** Full-screen hour timeline for one day (within the visible week). */
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  const startOfThisWeek = useMemo(() => getStartOfWeek(today), [today]);
  const visibleWeekStart = useMemo(
    () => addWeeks(startOfThisWeek, weekOffset),
    [startOfThisWeek, weekOffset]
  );
  const visibleWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(visibleWeekStart, i)),
    [visibleWeekStart]
  );
  const rangeLabel = formatRangeLabel(visibleWeekStart);
  const pastCapped = weekOffset <= MIN_PAST_WEEKS;
  const isPastWeek = weekOffset < 0;

  const { data: activities = [], isLoading } = useFamilyActivities(
    activeFamilyId,
    {
      from: visibleWeekDays[0],
      to: endOfLocalDay(visibleWeekDays[6]),
    }
  );

  const createMut = useCreateActivity(activeFamilyId);
  const updateMut = useUpdateActivity(activeFamilyId);
  const deleteMut = useDeleteActivity(activeFamilyId);

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
    setAddOpen(true);
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

  function creatorColor(a: Activity) {
    const m = a.created_by?.id ? memberById.get(a.created_by.id) : undefined;
    return m?.color?.hex ?? m?.color ?? "#2563eb";
  }

  function showDetails(a: Activity) {
    setDetailActivity(a);
  }

  // Group by each local calendar day the activity overlaps (multi-day → card on each day).
  const byDate = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    for (const a of activities) {
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
  }, [activities]);

  // Create
  function handleSaveActivity(form: NewActivityForm) {
    if (!activeFamilyId || !effectiveMember?.id) return;

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

    const participants: ActivityParticipantUpsert[] = (
      form.participants_member_ids ?? []
    ).map((id) => ({
      member_id: id,
      response: id === effectiveMember.id ? "YES" : "MAYBE",
      is_creator: id === effectiveMember.id,
    }));

    createMut.mutate({ activity, participants });
  }

  // Edit (patch+participants)
  function handleUpdateActivity(form: NewActivityForm) {
    if (!editingId) return;

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
      // only kid edits require re-approval; parent edits keep current status
      ...(hasParentPermissions ? {} : { status: "PENDING" as ActivityStatus }),
    };

    // For updates we let the DB preserve existing `response` & `is_creator`
    // for existing rows; new rows get default MAYBE.
    const participants: ActivityParticipantUpsert[] = (
      form.participants_member_ids ?? []
    ).map((id) => ({
      member_id: id,
      // no response / is_creator here → handled in SQL via coalesce + join
    }));

    updateMut.mutate({
      id: editingId,
      patch,
      participants,
      replaceParticipants: true,
    });

    setEditingId(null);
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

  const addModalInitialDateStr = dayViewDate
    ? toLocalDateKey(dayViewDate)
    : today.toISOString().split("T")[0];

  return (
    <Screen
      scroll={false}
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
      <View style={styles.center}>
        {dayViewDate ? (
          <ActivityDayView
            day={dayViewDate}
            activities={dayViewActivities}
            onClose={closeDayView}
            onPrevDay={() => shiftDayView(-1)}
            onNextDay={() => shiftDayView(1)}
            canPrevDay={dayViewIndex > 0}
            canNextDay={dayViewIndex >= 0 && dayViewIndex < 6}
            onActivityPress={showDetails}
            activityColor={creatorColor}
            activityColorStyle={activityColor}
            formatTimeRange={formatActivityTimeRange}
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
        />

        {/* Weekly list — scrolls; week nav header stays fixed (Screen scroll off) */}
        <ScrollView
          style={[styles.weekScroll, isPastWeek ? { opacity: 0.6 } : undefined]}
          contentContainerStyle={styles.weekList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {visibleWeekDays.map((d, i) => {
            const isToday = toLocalDateKey(d) === todayKey && weekOffset === 0;
            const key = toLocalDateKey(d);
            const items = byDate[key] || [];

            return (
              <View key={i} style={[styles.dayRow, isToday && styles.dayRowToday]}>
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
                    <Text style={styles.placeholder}>Loading…</Text>
                  ) : items.length === 0 ? (
                    <Text style={styles.placeholder}>No activities</Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {items.map((a) => {
                        const color = creatorColor(a);
                        const base = activityColor(a.status, color);

                        const badgeIcons = [
                          a.ride_needed && (
                            <MaterialCommunityIcons
                              key="ride"
                              name="car-outline"
                              size={16}
                              color="#64748b"
                            />
                          ),
                          a.present_needed && (
                            <MaterialCommunityIcons
                              key="present"
                              name="gift-outline"
                              size={16}
                              color="#64748b"
                            />
                          ),
                          a.babysitter_needed && (
                            <MaterialCommunityIcons
                              key="babysitter"
                              name="baby-face-outline"
                              size={16}
                              color="#64748b"
                            />
                          ),
                        ].filter(Boolean);

                        const goingMembers = (a.participants ?? [])
                          .map((p) => memberById.get(p.member_id))
                          .filter(Boolean) as any[];

                        const top3 = goingMembers.slice(0, 3);
                        const more = goingMembers.length - top3.length;

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
                              <View
                                style={[styles.colorDot, { backgroundColor: color }]}
                              />
                              <Text numberOfLines={2} style={styles.itemTitle}>
                                {a.title}
                              </Text>
                              <View style={styles.participantsCol}>
                                {top3.map((m: any) => (
                                  <View
                                    key={m.id}
                                    style={[
                                      styles.partDot,
                                      {
                                        backgroundColor:
                                          (m as any).color || "#94a3b8",
                                      },
                                    ]}
                                  />
                                ))}
                                {more > 0 ? (
                                  <Text style={styles.partMore}>+{more}</Text>
                                ) : null}
                              </View>
                            </View>

                            {a.start_at ? (
                              <View style={styles.itemLine2}>
                                <Text style={styles.itemTime}>
                                  {formatActivityTimeRange(a.start_at, a.end_at)}
                                </Text>
                                <View style={styles.itemLine2Spacer} />
                                {badgeIcons.length > 0 ? (
                                  <View style={styles.badgeIconsRow}>
                                    {badgeIcons}
                                  </View>
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
          })}
        </ScrollView>
          </>
        )}
      </View>

      {/* Create Activity */}
      <AddActivityModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveActivity}
        initialDateStr={addModalInitialDateStr}
        mode="create"
        submitLabel="Save"
        initial={{
          participants_member_ids: effectiveMember?.id ? [effectiveMember.id] : [],
        }}
      />

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        visible={!!detailActivity}
        activity={detailActivity}
        onClose={() => setDetailActivity(null)}
        onApprove={(id) => {
          updateMut.mutate({ id, patch: { status: "APPROVED" } });
          setDetailActivity(null);
        }}
        onReject={(id, reason) => {
          updateMut.mutate({
            id,
            patch: {
              status: "NOT_APPROVED",
              rejection_reason: reason.trim() ? reason.trim() : null,
            },
          });
          setDetailActivity(null);
        }}
        onRevertToPending={(id) => {
          updateMut.mutate(
            { id, patch: { status: "PENDING" } },
            {
              onSuccess: (updated) => {
                setDetailActivity(updated);
              },
            },
          );
        }}
        onDelete={(id) => {
          deleteMut.mutate(
            { id },
            {
              onSuccess: () => setDetailActivity(null),
            },
          );
        }}
        onEdit={(id) => {
          setDetailActivity(null);
          setEditingId(id);
          setEditOpen(true);
        }}
        memberById={memberById}
        creatorName={creatorName}
        isParent={hasParentPermissions}
        isCreator={
          !!(
            detailActivity?.created_by?.id &&
            detailActivity.created_by.id === effectiveMember?.id
          )
        }
      />

      {/* Edit Activity */}
      {editingId &&
        (() => {
          const activity = activities.find((x) => x.id === editingId);
          if (!activity) return null;

          const start = new Date(activity.start_at);
          const activityDateStr = toLocalDateKey(start);

          return (
            <AddActivityModal
              visible={editOpen}
              onClose={() => {
                setEditOpen(false);
                setEditingId(null);
              }}
              onSave={handleUpdateActivity}
              initialDateStr={activityDateStr}
              mode="edit"
              submitLabel="Update"
              initial={{
                title: activity.title,
                start_at: activity.start_at,
                end_at: activity.end_at,
                location: activity.location ?? undefined,
                money: activity.money ?? undefined,
                ride_needed: !!activity.ride_needed,
                present_needed: !!activity.present_needed,
                babysitter_needed: !!activity.babysitter_needed,
                participants_member_ids:
                  activity.participants?.map((p) => p.member_id) ?? [],
                notes: activity.notes ?? undefined,
              }}
            />
          );
        })()}
    </Screen>
  );

}

const styles = StyleSheet.create({

  center: { flex: 1, paddingLeft: 20, paddingRight: 16, paddingTop: 0, gap: 12 },

  subtitle: { marginTop: 2, fontSize: 13, color: "#475569" },

  /** Fills space below sticky week header so only the day list scrolls. */
  weekScroll: { flex: 1, minHeight: 0 },
  /** Scroll padding so last cards clear the FAB; Screen no longer uses a large bottom pad. */
  weekList: { gap: 10, paddingBottom: 100 },

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
    gap: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  itemTitle: {
    flex: 1,
    minWidth: 0,
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  itemLine2: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    gap: 8,
  },
  itemTime: {
    fontSize: 13,
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
  participantsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },

  partDot: { width: 8, height: 8, borderRadius: 999 },
  partMore: { fontSize: 12, color: "#334155", marginLeft: 2 },
});
