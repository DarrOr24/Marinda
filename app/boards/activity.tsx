// app/boards/activity.tsx
import AddActivityModal, { type NewActivityForm } from "@/components/AddActivityModal";
import CheckerboardBackground from "@/components/CheckerboardBackground";
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
function dateKey(d: Date) {
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

    // weekOffset: 0 = this week, +1 = next week, -1 = last week, etc.
    const [weekOffset, setWeekOffset] = useState<number>(0);

    // data
    const [byDate, setByDate] = useState<ActivitiesByDate>({});

    // modal
    const [addOpen, setAddOpen] = useState(false);
    const [defaultDayIndex, setDefaultDayIndex] = useState(0);

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

    // open modal, defaulting the picker to today's index (if within week)
    function openAddModal() {
        const idx = visibleWeekDays.findIndex((d) => sameDay(d, today));
        setDefaultDayIndex(idx >= 0 ? idx : 0);
        setAddOpen(true);
    }

    function handleSaveActivity(form: NewActivityForm) {
        // Map the form's day_index to the actual date in the visible week
        const targetDate = visibleWeekDays[form.day_index] ?? visibleWeekDays[0];
        const key = dateKey(targetDate);

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

    function showDetails(a: Activity) {
        const lines = [
            `Title: ${a.title}`,
            a.time ? `Time: ${a.time}` : "",
            a.location ? `Location: ${a.location}` : "",
            typeof a.money === "number" ? `Money: $${a.money.toFixed(2)}` : "",
            a.ride_needed ? "Ride needed: yes" : "Ride needed: no",
            a.present_needed ? "Present needed: yes" : "Present needed: no",
            a.babysitter_needed ? "Babysitter needed: yes" : "Babysitter needed: no",
            a.other ? `Notes: ${a.other}` : "",
            `Status: ${a.status}`,
            `Created by: ${a.created_by_name}`,
            `Created at: ${new Date(a.created_at).toLocaleString()}`,
        ]
            .filter(Boolean)
            .join("\n");

        Alert.alert("Activity", lines);
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
                        const key = dateKey(d);
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

                                {/* Activities list (title + time only, colored by member + status) */}
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
                                                        </Text>
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

            {/* Add Activity */}
            <AddActivityModal
                visible={addOpen}
                onClose={() => setAddOpen(false)}
                onSave={handleSaveActivity}
                default_day_index={defaultDayIndex}
                week_days={visibleWeekDays}
            />
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
    itemPending: {
        // nothing extra — shows the colored border
    },
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
    itemTitle: {
        flex: 1,
        color: "#0f172a",
        fontWeight: "600",
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
