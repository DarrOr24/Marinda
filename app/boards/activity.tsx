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

import { ActivityDetailModal } from "@/components/modals/activity-detail-modal";
import AddActivityModal, { type NewActivityForm } from "@/components/modals/add-activity-modal";
import { Button } from "@/components/ui/button";
import { SafeFab } from "@/components/ui/safe-fab";
import { Screen } from "@/components/ui/screen";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  useCreateActivity,
  useFamilyActivities,
  useUpdateActivity,
} from "@/lib/activities/activities.hooks";
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
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTimeFromIso(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ActivityBoard() {
  const today = new Date();
  const { member, activeFamilyId } = useAuthContext() as any;
  const { familyMembers } = useFamily(activeFamilyId);

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [addOpen, setAddOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);

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
      to: visibleWeekDays[6],
    }
  );

  const createMut = useCreateActivity(activeFamilyId);
  const updateMut = useUpdateActivity(activeFamilyId);

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

  const myRole = (member?.role ?? member?.profile?.role ?? "").toUpperCase();
  const isParent = ["DAD", "MOM", "ADULT"].includes(myRole);

  function showDetails(a: Activity) {
    setDetailActivity(a);
  }

  // Group activities by start date (local)
  const byDate = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    for (const a of activities) {
      const key = toDateKey(new Date(a.start_at));
      (map[key] ??= []).push(a);
    }
    return map;
  }, [activities]);

  // Create
  function handleSaveActivity(form: NewActivityForm) {
    if (!activeFamilyId || !member?.id) return;

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
      created_by: member.id,
    };

    const participants: ActivityParticipantUpsert[] = (
      form.participants_member_ids ?? []
    ).map((id) => ({
      member_id: id,
      response: id === member.id ? "YES" : "MAYBE",
      is_creator: id === member.id,
    }));

    createMut.mutate({ activity, participants });
  }

  // Edit (patch+participants)
  function handleUpdateActivity(form: NewActivityForm) {
    if (!editingId) return;

    const patch: Partial<ActivityInsert> & { status?: ActivityStatus } = {
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
      ...(isParent ? {} : { status: "PENDING" as ActivityStatus }),
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

  const todayKey = toDateKey(today);

  return (
    <Screen
      bottomOffset={72}
      gap="md"
      contentStyle={{ paddingTop: 8, paddingHorizontal: 0 }}
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
        {/* Header w/ week navigation */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() =>
              !pastCapped && setWeekOffset((o) => Math.max(MIN_PAST_WEEKS, o - 1))
            }
            style={[styles.navBtn, pastCapped && styles.navBtnDisabled]}
            disabled={pastCapped}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={26}
              color={pastCapped ? "#94a3b8" : "#0f172a"}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>
              {weekOffset === 0 ? "This week" : rangeLabel}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setWeekOffset((o) => o + 1)}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Next week"
          >
            <MaterialCommunityIcons name="chevron-right" size={26} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Weekly list */}
        <ScrollView
          contentContainerStyle={styles.weekList}
          style={isPastWeek ? { opacity: 0.6 } : undefined}
        >
          {visibleWeekDays.map((d, i) => {
            const isToday = toDateKey(d) === todayKey && weekOffset === 0;
            const key = toDateKey(d);
            const items = byDate[key] || [];

            return (
              <View key={i} style={[styles.dayRow, isToday && styles.dayRowToday]}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                    {DAY_NAMES[d.getDay()]}
                  </Text>
                  <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
                    {d.getDate()}
                  </Text>
                </View>

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
                            <View
                              style={[styles.colorDot, { backgroundColor: color }]}
                            />
                            <Text numberOfLines={1} style={styles.itemTitle}>
                              {a.title}
                              {a.start_at ? ` — ${formatTimeFromIso(a.start_at)}` : ""}
                            </Text>
                            {badgeIcons.length > 0 ? (
                              <View style={styles.badgeIcons}>
                                {badgeIcons}
                              </View>
                            ) : null}

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
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
      </View>

      {/* Create Activity */}
      <AddActivityModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveActivity}
        initialDateStr={today.toISOString().split("T")[0]}
        mode="create"
        submitLabel="Save"
        initial={{
          participants_member_ids: member?.id ? [member.id] : [],
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
        onReject={(id) => {
          updateMut.mutate({ id, patch: { status: "NOT_APPROVED" } });
          setDetailActivity(null);
        }}
        onEdit={(id) => {
          setDetailActivity(null);
          setEditingId(id);
          setEditOpen(true);
        }}
        memberById={memberById}
        creatorName={creatorName}
        isParent={isParent}
        isCreator={
          !!(
            detailActivity?.created_by?.id &&
            detailActivity.created_by.id === member?.id
          )
        }
      />

      {/* Edit Activity */}
      {editingId &&
        (() => {
          const activity = activities.find((x) => x.id === editingId);
          if (!activity) return null;

          const start = new Date(activity.start_at);
          const activityDateStr = toDateKey(start);

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

  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 2, fontSize: 13, color: "#475569" },

  weekList: { gap: 10, paddingBottom: 24 },

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
  },
  dayName: { fontWeight: "700", color: "#334155" },
  dayNameToday: { color: "#2563eb" },
  dayDate: { fontSize: 13, color: "#64748b", marginTop: 2 },
  dayDateToday: { color: "#1d4ed8", fontWeight: "700" },
  dayContent: { flex: 1, padding: 10, justifyContent: "center" },
  placeholder: { color: "#94a3b8", fontStyle: "italic" },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  itemPending: {},
  colorDot: { width: 8, height: 8, borderRadius: 999 },
  itemTitle: { flex: 1, color: "#0f172a", fontWeight: "700" },
  badgeIcons: { flexDirection: "row", alignItems: "center", gap: 6 },

  partDot: { width: 8, height: 8, borderRadius: 999 },
  partMore: { fontSize: 12, color: "#334155", marginLeft: 2 },
});
