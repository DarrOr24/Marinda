// app/boards/activity.tsx
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Alert,
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
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [seriesEditScope, setSeriesEditScope] = useState<"single" | "forward" | null>(
    null,
  );
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const queryClient = useQueryClient();
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

  const { data: activities = [], isLoading } = useFamilyCalendarActivities(
    activeFamilyId,
    {
      from: visibleWeekDays[0],
      to: endOfLocalDay(visibleWeekDays[6]),
    }
  );

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

  function rowAccentColor(a: Activity) {
    return getActivityRowAccentColor(a, memberById);
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
            const nextRule = continuationRecurrenceRule(
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
      <View style={[styles.center, dayViewDate && styles.centerDayTimeline]}>
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
            activityColor={rowAccentColor}
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
                        const color = rowAccentColor(a);
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
                    setDetailActivity(null);
                    setEditingActivity(activity);
                    setSeriesEditScope("single");
                    setEditOpen(true);
                  },
                },
                {
                  text: "This and future events",
                  onPress: () => {
                    setDetailActivity(null);
                    setEditingActivity(activity);
                    setSeriesEditScope("forward");
                    setEditOpen(true);
                  },
                },
              ],
            );
            return;
          }
          setDetailActivity(null);
          setEditingActivity(activity);
          setSeriesEditScope(null);
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
      {editingActivity ? (
        <AddActivityModal
          visible={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditingActivity(null);
            setSeriesEditScope(null);
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
        />
      ) : null}
    </Screen>
  );

}

const styles = StyleSheet.create({

  center: { flex: 1, paddingLeft: 20, paddingRight: 16, paddingTop: 0, gap: 12 },
  /** Tighter horizontal inset so the day timeline & time column use narrow phone width. */
  centerDayTimeline: { paddingLeft: 10, paddingRight: 10, gap: 0 },

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
});
