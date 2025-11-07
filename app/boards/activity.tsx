import AddActivityModal, { type NewActivityForm } from "@/components/add-activity-modal";
import CheckerboardBackground from "@/components/checkerboard-background";
import { members as FAMILY_MEMBERS } from "@/data/members";
import { useAuthContext } from "@/hooks/use-auth-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

// --- Config / Helpers ---
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MIN_PAST_WEEKS = -4; // cap going back 4 weeks

function getStartOfWeek(d = new Date()) {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = copy.getDay(); // 0=Sun..6=Sat
    copy.setDate(copy.getDate() - day);
    copy.setHours(0, 0, 0, 0);
    return copy;
}
function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
function addWeeks(date: Date, weeks: number) {
    return addDays(date, weeks * 7);
}
function sameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}
function formatRangeLabel(start: Date) {
    const end = addDays(start, 6);
    const fmt = (d: Date) =>
        d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
        return `${start.toLocaleDateString(undefined, {
            month: "short",
        })} ${start.getDate()}–${end.getDate()}`;
    }
    return `${fmt(start)} – ${fmt(end)}`;
}
function toDateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
}
const makeId = () =>
    (globalThis as any)?.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// --- Types (snake_case to match Supabase later) ---
type Activity = NewActivityForm & {
    id: string;
    date_key: string; // YYYY-MM-DD (for grouping)
};
type ActivitiesByDate = Record<string, Activity[]>;

export default function ActivityBoard() {
    const today = new Date();
    const { member } = useAuthContext() as any;

    // weekOffset: 0 = this week, +1 = next week, -1 = last week, etc.
    const [weekOffset, setWeekOffset] = useState<number>(0);

    // data
    const [byDate, setByDate] = useState<ActivitiesByDate>({});

    // modals
    const [addOpen, setAddOpen] = useState(false);
    const [defaultDayIndex, setDefaultDayIndex] = useState(0);

    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<Activity | null>(null);

    // Compute the visible week's start date
    const startOfThisWeek = useMemo(() => getStartOfWeek(today), [today]);
    const visibleWeekStart = useMemo(
        () => addWeeks(startOfThisWeek, weekOffset),
        [startOfThisWeek, weekOffset]
    );
    const visibleWeekDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(visibleWeekStart, i)),
        [visibleWeekStart]
    );

    const pastCapped = weekOffset <= MIN_PAST_WEEKS;
    const isPastWeek = weekOffset < 0;
    const rangeLabel = formatRangeLabel(visibleWeekStart);

    // Resolve names/colors for participants
    const memberById = useMemo(() => {
        const map = new Map<string, (typeof FAMILY_MEMBERS)[number]>();
        for (const m of FAMILY_MEMBERS) map.set(m.id, m as any);
        return map;
    }, []);

    function resolveParticipantNames(ids?: string[]) {
        if (!ids?.length) return "";
        return ids
            .map((id) => memberById.get(id)?.name)
            .filter(Boolean)
            .join(", ");
    }

    // open modal, defaulting the picker to today's index (if within week)
    function openAddModal() {
        const idx = visibleWeekDays.findIndex((d) => sameDay(d, today));
        setDefaultDayIndex(idx >= 0 ? idx : 0);
        setAddOpen(true);
    }

    function handleSaveActivity(form: NewActivityForm) {
        const targetDate = visibleWeekDays[form.day_index] ?? visibleWeekDays[0];
        const key = toDateKey(targetDate);

        const toSave: Activity = {
            ...form,
            id: makeId(),
            date_key: key,
        };

        setByDate((prev) => ({
            ...prev,
            [key]: prev[key] ? [toSave, ...prev[key]] : [toSave],
        }));
    }

    function handleUpdateActivity(form: NewActivityForm) {
        if (!editing) return;

        const oldKey = editing.date_key;
        const newDate = visibleWeekDays[form.day_index] ?? visibleWeekDays[0];
        const newKey = toDateKey(newDate);

        const updated: Activity = {
            ...editing,
            ...form,
            date_key: newKey,
        };

        setByDate((prev) => {
            if (oldKey === newKey) {
                const arr = prev[oldKey] ?? [];
                const replaced = arr.map((x) => (x.id === editing.id ? updated : x));
                return { ...prev, [oldKey]: replaced };
            }
            const oldArr = prev[oldKey] ?? [];
            const without = oldArr.filter((x) => x.id !== editing.id);
            const newArr = prev[newKey] ? [updated, ...prev[newKey]!] : [updated];
            return { ...prev, [oldKey]: without, [newKey]: newArr };
        });

        setEditing(null);
        setEditOpen(false);
    }

    function deleteActivity(a: Activity) {
        setByDate((prev) => {
            const arr = prev[a.date_key] ?? [];
            const filtered = arr.filter((x) => x.id !== a.id);
            return { ...prev, [a.date_key]: filtered };
        });
    }

    function openEditModal(a: Activity) {
        setEditing(a);
        const idx = visibleWeekDays.findIndex((d) => toDateKey(d) === a.date_key);
        setDefaultDayIndex(idx >= 0 ? idx : 0);
        setEditOpen(true);
    }

    function showDetails(a: Activity) {
        const names = resolveParticipantNames(a.participants_member_ids);
        const lines = [
            `🏷️ ${a.title}`,
            `📅 ${a.date_key}`,
            "",

            a.time ? `🕒 ${a.time}` : "",
            a.location ? `📍 ${a.location}` : "",
            typeof a.money === "number" ? `💵 $${a.money.toFixed(2)}` : "",
            "",

            `🚗 Ride: ${a.ride_needed ? "✅" : "❌"}`,
            `🎁 Present: ${a.present_needed ? "✅" : "❌"}`,
            `🍼 Babysitter: ${a.babysitter_needed ? "✅" : "❌"}`,
            names ? `👥 Who’s going: ${names}` : "👥 Who’s going: —",
            a.other ? `📝 ${a.other}` : "",
            "",

            a.status === "approved" ? "✅ All set!" : "⏳ Waiting for approval",
            `👤 ${a.created_by_name}`,
        ]
            .filter((s) => s !== undefined)
            .join("\n");

        const buttons: any[] = [{ text: "CLOSE", style: "cancel" }];

        if (a.created_by === member?.profile?.id) {
            buttons.unshift({
                text: "DELETE 🗑️",
                style: "destructive",
                onPress: () => {
                    Alert.alert("Delete activity?", "This cannot be undone.", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteActivity(a) },
                    ]);
                },
            });
            buttons.unshift({
                text: "EDIT  ✏️",
                onPress: () => openEditModal(a),
            });
        }

        Alert.alert("Activity", lines, buttons);
    }

    return (
        <View style={styles.screen}>
            <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

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
                        <Text style={styles.title}>Activity Board</Text>
                        <Text style={styles.subtitle}>
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

                {/* Weekly list — one row per day */}
                <ScrollView
                    contentContainerStyle={styles.weekList}
                    style={isPastWeek ? { opacity: 0.6 } : undefined}
                >
                    {visibleWeekDays.map((d, i) => {
                        const isToday = sameDay(d, today) && weekOffset === 0;
                        const key = toDateKey(d);
                        const items = byDate[key] || [];

                        return (
                            <View key={i} style={[styles.dayRow, isToday && styles.dayRowToday]}>
                                {/* Day header on the left */}
                                <View style={styles.dayHeader}>
                                    <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                                        {DAY_NAMES[d.getDay()]}
                                    </Text>
                                    <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
                                        {d.getDate()}
                                    </Text>
                                </View>

                                {/* Activities list */}
                                <View style={styles.dayContent}>
                                    {items.length === 0 ? (
                                        <Text style={styles.placeholder}>No activities</Text>
                                    ) : (
                                        <View style={{ gap: 8 }}>
                                            {items.map((a) => {
                                                const base = {
                                                    borderColor: a.member_color,
                                                    backgroundColor:
                                                        a.status === "approved" ? `${a.member_color}22` : "#fff",
                                                };

                                                // build badges (need flags) and participant dots (who's going)
                                                const badges = [
                                                    a.ride_needed ? "🚗" : "",
                                                    a.present_needed ? "🎁" : "",
                                                    a.babysitter_needed ? "🍼" : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ");

                                                const going = (a.participants_member_ids ?? [])
                                                    .map((id) => memberById.get(id))
                                                    .filter(Boolean) as any[];

                                                const top3 = going.slice(0, 3);
                                                const more = going.length - top3.length;

                                                return (
                                                    <Pressable
                                                        key={a.id}
                                                        onPress={() => showDetails(a)}
                                                        style={[styles.itemRow, base, a.status === "pending" && styles.itemPending]}
                                                    >
                                                        <View style={[styles.colorDot, { backgroundColor: a.member_color }]} />
                                                        <Text numberOfLines={1} style={styles.itemTitle}>
                                                            {a.title}
                                                            {a.time ? ` — ${a.time}` : ""}
                                                            {badges ? `  ${badges}` : ""}
                                                        </Text>

                                                        {/* tiny participant dots */}
                                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                            {top3.map((m) => (
                                                                <View
                                                                    key={m.id}
                                                                    style={[
                                                                        styles.partDot,
                                                                        { backgroundColor: (m as any).color || "#94a3b8" },
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

            {/* FAB: Add activity */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={openAddModal}
                accessibilityRole="button"
                accessibilityLabel="Add activity"
            >
                <MaterialCommunityIcons name="plus" size={26} color="#fff" />
            </TouchableOpacity>

            {/* Create Activity */}
            <AddActivityModal
                visible={addOpen}
                onClose={() => setAddOpen(false)}
                onSave={handleSaveActivity}
                default_day_index={defaultDayIndex}
                week_days={visibleWeekDays}
                mode="create"
                submitLabel="Save"
            />

            {/* Edit Activity */}
            {editing && (
                <AddActivityModal
                    visible={editOpen}
                    onClose={() => {
                        setEditOpen(false);
                        setEditing(null);
                    }}
                    onSave={handleUpdateActivity}
                    default_day_index={defaultDayIndex}
                    week_days={visibleWeekDays}
                    mode="edit"
                    submitLabel="Update"
                    initial={{
                        title: editing.title,
                        day_index: defaultDayIndex,
                        time: editing.time,
                        location: editing.location,
                        money: editing.money,
                        ride_needed: editing.ride_needed,
                        present_needed: editing.present_needed,
                        babysitter_needed: editing.babysitter_needed,
                        participants_member_ids: editing.participants_member_ids, // 👈 NEW
                        other: editing.other,
                        status: editing.status,
                        created_by: editing.created_by,
                        created_by_name: editing.created_by_name,
                        member_color: editing.member_color,
                        created_at: editing.created_at,
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#E6F4FE",
    },
    center: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 12,
    },

    // Header w/ navigation
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
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
    navBtnDisabled: {
        backgroundColor: "#f8fafc",
        borderColor: "#e2e8f0",
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0f172a",
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        color: "#475569",
    },

    // Week list
    weekList: {
        gap: 10,
        paddingBottom: 24,
    },

    // Day rows
    dayRow: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        overflow: "hidden",
        minHeight: 72,
    },
    dayRowToday: {
        borderColor: "#2563eb",
        backgroundColor: "#f8fbff",
    },
    dayHeader: {
        width: 84,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f1f5f9",
        borderRightWidth: 1,
        borderRightColor: "#e2e8f0",
        paddingVertical: 10,
    },
    dayName: {
        fontWeight: "700",
        color: "#334155",
    },
    dayNameToday: {
        color: "#2563eb",
    },
    dayDate: {
        fontSize: 13,
        color: "#64748b",
        marginTop: 2,
    },
    dayDateToday: {
        color: "#1d4ed8",
        fontWeight: "700",
    },
    dayContent: {
        flex: 1,
        padding: 10,
        justifyContent: "center",
    },
    placeholder: {
        color: "#94a3b8",
        fontStyle: "italic",
    },

    // Activity item
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 2, // pending uses border tint
        borderRadius: 10,
        backgroundColor: "#fff",
    },
    itemPending: {},
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
    itemTitle: {
        flex: 1,
        color: "#0f172a",
        fontWeight: "700",
    },

    // tiny participant dots
    partDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
    partMore: {
        fontSize: 12,
        color: "#334155",
        marginLeft: 2,
    },

    // FAB
    fab: {
        position: "absolute",
        right: 18,
        bottom: 18,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#2563eb",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
});
