// components/weekly-points-chart.tsx
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type WeeklyEntry = {
    delta: number;
    created_at: string;
};

type Props = {
    history: WeeklyEntry[];
};

export default function WeeklyPointsChart({ history }: Props) {
    const [weekOffset, setWeekOffset] = useState(0);
    // selection now is per *bar* (earned/spent) not per day
    const [selected, setSelected] = useState<{ day: number; kind: "earned" | "spent" } | null>(
        null
    );

    // --- Compute week start (Sunday) ---
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun ... 6 = Sat

    const startOfThisWeek = new Date(today);
    startOfThisWeek.setHours(0, 0, 0, 0);
    startOfThisWeek.setDate(today.getDate() - dayOfWeek);

    // Apply offset for navigation
    const startOfTargetWeek = new Date(startOfThisWeek);
    startOfTargetWeek.setDate(startOfThisWeek.getDate() + weekOffset * 7);

    const endOfTargetWeek = new Date(startOfTargetWeek);
    endOfTargetWeek.setDate(startOfTargetWeek.getDate() + 6);
    endOfTargetWeek.setHours(23, 59, 59, 999);

    const formatRange = (d1: Date, d2: Date) => {
        const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
        return `${d1.toLocaleDateString(undefined, opts)} – ${d2.toLocaleDateString(undefined, opts)}`;
    };

    // --- Filter history to this week only ---
    const weekRows = useMemo(() => {
        const s = startOfTargetWeek.getTime();
        const e = endOfTargetWeek.getTime();
        return history.filter((h) => {
            const t = new Date(h.created_at).getTime();
            return t >= s && t <= e;
        });
    }, [history, startOfTargetWeek, endOfTargetWeek]);

    /**
     * Build totals for each weekday:
     * - earnedTotals[i] = sum of deltas > 0 for that day
     * - spentTotals[i]  = sum of abs(deltas < 0) for that day
     * - netTotals[i]    = earned - spent for that day
     */
    const { earnedTotals, spentTotals, netTotals } = useMemo(() => {
        const earned = [0, 0, 0, 0, 0, 0, 0];
        const spent = [0, 0, 0, 0, 0, 0, 0];

        weekRows.forEach((entry) => {
            const d = new Date(entry.created_at);
            const idx = d.getDay();
            if (entry.delta >= 0) earned[idx] += entry.delta;
            else spent[idx] += Math.abs(entry.delta);
        });

        const net = earned.map((e, i) => e - spent[i]);
        return { earnedTotals: earned, spentTotals: spent, netTotals: net };
    }, [weekRows]);

    const weekEarned = earnedTotals.reduce((a, b) => a + b, 0);
    const weekSpent = spentTotals.reduce((a, b) => a + b, 0);
    const weekNet = weekEarned - weekSpent;

    // --- Scale bars based on max earned/spent (so spends show even if net is low) ---
    const maxVal = Math.max(...earnedTotals, ...spentTotals, 1);
    const roundedMax = Math.max(10, Math.ceil(maxVal / 10) * 10);

    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

    const isBarSelected = (day: number, kind: "earned" | "spent") =>
        selected?.day === day && selected?.kind === kind;

    const toggleBar = (day: number, kind: "earned" | "spent", value: number) => {
        // ✅ rule #2: nothing happens if value is 0
        if (!value || value <= 0) return;

        setSelected((prev) => {
            if (prev?.day === day && prev?.kind === kind) return null;
            return { day, kind };
        });
    };

    return (
        <View style={styles.card}>
            {/* Header with week navigation */}
            <View style={styles.headerRow}>
                <Pressable onPress={() => setWeekOffset((o) => o - 1)} style={styles.arrowBtn}>
                    <Text style={styles.arrowText}>←</Text>
                </Pressable>

                <Text style={styles.headerText}>{formatRange(startOfTargetWeek, endOfTargetWeek)}</Text>

                <Pressable
                    onPress={() => setWeekOffset((o) => Math.min(o + 1, 0))}
                    style={[styles.arrowBtn, weekOffset === 0 && { opacity: 0.3 }]}
                    disabled={weekOffset === 0}
                >
                    <Text style={styles.arrowText}>→</Text>
                </Pressable>
            </View>

            {/* Net total + breakdown (keep this calm) */}
            <Text style={styles.totalText}>{weekNet} pts</Text>
            <View style={styles.breakdownRow}>
                <Text style={styles.breakdownText}>Earned +{weekEarned}</Text>
                <Text style={styles.breakdownText}>Spent -{weekSpent}</Text>
            </View>

            {/* Chart area */}
            <View style={styles.chartWrapper}>
                <View style={styles.chartInner}>
                    {dayLabels.map((label, i) => {
                        const earnedVal = earnedTotals[i];
                        const spentVal = spentTotals[i];
                        const earnedHeight = (earnedVal / roundedMax) * 90;
                        const spentHeight = (spentVal / roundedMax) * 90;

                        return (
                            <View key={i} style={styles.dayColumn}>
                                {/* ✅ rule #3: simple number labels, shown only when that bar is selected */}
                                <View style={styles.valueRow}>
                                    <View style={styles.valueSlot}>
                                        {isBarSelected(i, "earned") ? (
                                            <Text style={styles.valueLabel}>+{earnedVal}</Text>
                                        ) : (
                                            <View style={{ height: 14 }} />
                                        )}
                                    </View>

                                    <View style={styles.valueSlot}>
                                        {isBarSelected(i, "spent") ? (
                                            <Text style={styles.valueLabel}>-{spentVal}</Text>
                                        ) : (
                                            <View style={{ height: 14 }} />
                                        )}
                                    </View>
                                </View>

                                {/* Bars (no space between green and red) */}
                                <View style={styles.barsRow}>
                                    <Pressable
                                        style={styles.barPress}
                                        onPress={() => toggleBar(i, "earned", earnedVal)}
                                        hitSlop={8}
                                    >
                                        <View
                                            style={[
                                                styles.bar,
                                                styles.barPositive,
                                                { height: earnedHeight },
                                                isBarSelected(i, "earned") && styles.barSelected,
                                                earnedVal === 0 && styles.barZero, // no outline, no nothing
                                            ]}
                                        />
                                    </Pressable>

                                    <Pressable
                                        style={styles.barPress}
                                        onPress={() => toggleBar(i, "spent", spentVal)}
                                        hitSlop={8}
                                    >
                                        <View
                                            style={[
                                                styles.bar,
                                                styles.barNegative,
                                                { height: spentHeight },
                                                isBarSelected(i, "spent") && styles.barSelected,
                                                spentVal === 0 && styles.barZero,
                                            ]}
                                        />
                                    </Pressable>
                                </View>

                                <Text style={styles.dayLabel}>{label}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        alignSelf: "stretch",
    },

    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    arrowBtn: {
        padding: 4,
    },
    arrowText: {
        fontSize: 22,
        fontWeight: "600",
        color: "#1e3a8a",
    },
    headerText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0f172a",
        marginTop: 5,
    },

    totalText: {
        fontSize: 24,
        fontWeight: "800",
        marginTop: 8,
        color: "#1e3a8a",
        textAlign: "center",
    },

    breakdownRow: {
        marginTop: 4,
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
    },
    breakdownText: {
        fontSize: 12,
        color: "#64748b",
        fontWeight: "600",
    },

    chartWrapper: {
        marginTop: 12,
        height: 130,
        position: "relative",
    },
    chartInner: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 110,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },

    dayColumn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
    },

    // labels row above bars (2 slots: earned and spent)
    valueRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        height: 16,
        marginBottom: 4,
    },
    valueSlot: {
        width: 34,
        alignItems: "center",
    },
    valueLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: "#1e3a8a",
        textAlign: "center",
        includeFontPadding: false,
    },

    // ✅ no gap between bars
    barsRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        height: 95,
        gap: 0, // 👈 IMPORTANT
    },
    barPress: {
        width: 14,
        alignItems: "center",
    },
    bar: {
        width: 14,
        borderRadius: 8,
    },
    barPositive: {
        backgroundColor: "rgba(16,185,129,0.75)",
    },
    barNegative: {
        backgroundColor: "rgba(239,68,68,0.75)",
    },

    barSelected: {
        borderWidth: 2,
        borderColor: "#1e3a8a",
    },

    // ✅ make "0" bars truly invisible + non-annoying
    barZero: {
        height: 0,
        borderWidth: 0,
    },

    dayLabel: {
        marginTop: 4,
        fontSize: 11,
        color: "#475569",
    },
});
