// components/weekly-points-chart.tsx
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type WeeklyEntry = {
    delta: number;
    created_at: string;
};

type Props = {
    history: WeeklyEntry[];
};

export default function WeeklyPointsChart({ history }: Props) {
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

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

    const formatRange = (d1: Date, d2: Date) => {
        const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${d1.toLocaleDateString(undefined, opts)} – ${d2.toLocaleDateString(
            undefined,
            opts
        )}`;
    };

    // --- Filter history to this week only ---
    const weekRows = useMemo(() => {
        const s = startOfTargetWeek.getTime();
        const e = endOfTargetWeek.getTime();
        return history.filter(h => {
            const t = new Date(h.created_at).getTime();
            return t >= s && t <= e;
        });
    }, [history, startOfTargetWeek, endOfTargetWeek]);

    // --- Build totals for each weekday (0–6 = Sun–Sat) ---
    const dailyTotals = useMemo(() => {
        const arr = [0, 0, 0, 0, 0, 0, 0]; // Sun–Sat
        weekRows.forEach(entry => {
            const d = new Date(entry.created_at);
            arr[d.getDay()] += entry.delta;
        });
        return arr;
    }, [weekRows]);

    // --- Determine vertical scale (rounded to nice 10s) ---
    const maxVal = Math.max(...dailyTotals.map(v => Math.abs(v)), 1);
    const roundedMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
    const yTicks = [roundedMax, roundedMax / 2];

    const weekTotal = dailyTotals.reduce((a, b) => a + b, 0);

    return (
        <View style={styles.card}>
            {/* Header with week navigation */}
            <View style={styles.headerRow}>
                <Pressable
                    onPress={() => setWeekOffset(o => o - 1)}
                    style={styles.arrowBtn}
                >
                    <Text style={styles.arrowText}>←</Text>
                </Pressable>

                <Text style={styles.headerText}>
                    {formatRange(startOfTargetWeek, endOfTargetWeek)}
                </Text>

                <Pressable
                    onPress={() => setWeekOffset(o => Math.min(o + 1, 0))}
                    style={[styles.arrowBtn, weekOffset === 0 && { opacity: 0.3 }]}
                    disabled={weekOffset === 0}
                >
                    <Text style={styles.arrowText}>→</Text>
                </Pressable>
            </View>


            <Text style={styles.totalText}>{weekTotal} pts</Text>

            {/* Chart area */}
            <View style={styles.chartWrapper}>

                {/* Bars row */}
                <View style={styles.chartInner}>
                    {dailyTotals.map((val, i) => {
                        const heightRatio = Math.abs(val) / roundedMax;
                        const barHeight = heightRatio * 90; // 90px max bar height

                        const isSelected = selectedDay === i;
                        const positive = val >= 0;

                        return (
                            <Pressable
                                key={i}
                                style={styles.barContainer}
                                onPress={() =>
                                    setSelectedDay(prev => (prev === i ? null : i))
                                }
                            >
                                {/* Column: value (if selected) → bar → day letter */}
                                <View style={styles.barColumn}>
                                    {isSelected ? (
                                        <Text style={styles.valueLabel}>{val} pts</Text>
                                    ) : (
                                        <View style={{ height: 16 }} />
                                    )}

                                    <View
                                        style={[
                                            styles.bar,
                                            { height: barHeight },
                                            positive ? styles.barPositive : styles.barNegative,
                                            isSelected && styles.barSelected,
                                        ]}
                                    />

                                    <Text style={styles.dayLabel}>
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignSelf: 'stretch',
    },

    /* Header */
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    arrowBtn: {
        padding: 4,

    },
    arrowText: {
        fontSize: 22,
        fontWeight: '600',
        color: '#1e3a8a',
    },
    headerText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 5,
    },
    totalText: {
        fontSize: 24,
        fontWeight: '800',
        marginTop: 8,
        color: '#1e3a8a',
        textAlign: 'center',
    },

    /* Chart + grid */
    chartWrapper: {
        marginTop: 12,
        height: 120,
        position: 'relative',
    },
    chartInner: {
        position: 'absolute',
        left: 0, // room for y labels
        right: 0,
        bottom: 0,
        height: 95,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    /* Bars */
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barColumn: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
    },
    bar: {
        width: 18,
        borderRadius: 8,
    },
    barPositive: {
        backgroundColor: 'rgba(16,185,129,0.75)', // green
    },
    barNegative: {
        backgroundColor: 'rgba(239,68,68,0.75)', // red
    },

    valueLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1e3a8a',
        marginBottom: 4,
    },

    dayLabel: {
        marginTop: 4,
        fontSize: 11,
        color: '#475569',
    },

    barSelected: {
        borderWidth: 2,
        borderColor: '#1e3a8a',
    },
});
