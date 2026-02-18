// components/wishlist-calculator.tsx
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TextInput } from "@/components/ui";

type Props = {
    /** Points per 1 unit of currency (e.g. 10 pts = $1) */
    pointsPerCurrency: number;
    /** Currency code (e.g. CAD, USD) */
    currency: string;
};

/**
 * Bidirectional calculator: enter currency amount or points and the other field updates.
 */
export function WishlistCalculator({ pointsPerCurrency, currency }: Props) {
    const [calcCad, setCalcCad] = useState("");
    const [calcPointsStr, setCalcPointsStr] = useState("");
    const [calcLock, setCalcLock] = useState<"cad" | "points" | null>(null);

    const calcPoints = useMemo(() => {
        const cad = parseFloat(calcCad);
        if (!calcCad.trim() || Number.isNaN(cad)) return 0;
        return Math.round(cad * pointsPerCurrency);
    }, [calcCad, pointsPerCurrency]);

    const calcCadFromPoints = useMemo(() => {
        const pts = parseFloat(calcPointsStr);
        if (!calcPointsStr.trim() || Number.isNaN(pts)) return "";
        return (pts / pointsPerCurrency).toFixed(2);
    }, [calcPointsStr, pointsPerCurrency]);

    useEffect(() => {
        if (calcLock === "cad") {
            if (!calcCad.trim()) setCalcPointsStr("");
            else setCalcPointsStr(String(calcPoints));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calcCad]);

    useEffect(() => {
        if (calcLock === "points") {
            if (!calcPointsStr.trim()) setCalcCad("");
            else setCalcCad(calcCadFromPoints);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calcPointsStr]);

    // Recalculate when conversion rate changes (e.g. user returns from settings)
    useEffect(() => {
        if (calcCad.trim()) {
            const cad = parseFloat(calcCad);
            if (!Number.isNaN(cad)) {
                setCalcPointsStr(String(Math.round(cad * pointsPerCurrency)));
            }
        } else if (calcPointsStr.trim()) {
            const pts = parseFloat(calcPointsStr);
            if (!Number.isNaN(pts)) {
                setCalcCad((pts / pointsPerCurrency).toFixed(2));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pointsPerCurrency]);

    return (
        <View style={styles.wrapper}>
            <View style={styles.row}>
                <View style={styles.inputWrap}>
                    <TextInput
                        label={currency}
                        placeholder="0"
                        keyboardType="numeric"
                        value={calcCad}
                        onChangeText={(v) => {
                            setCalcLock("cad");
                            setCalcCad(v);
                        }}
                        onBlur={() => setCalcLock(null)}
                        style={styles.input}
                    />
                </View>

                <Text style={styles.arrow}>↔</Text>

                <View style={styles.inputWrap}>
                    <TextInput
                        label="Points"
                        placeholder="0"
                        keyboardType="numeric"
                        value={calcPointsStr}
                        onChangeText={(v) => {
                            setCalcLock("points");
                            setCalcPointsStr(v);
                        }}
                        onBlur={() => setCalcLock(null)}
                        style={styles.input}
                    />
                </View>
            </View>

            <Text style={styles.rateText}>
                {pointsPerCurrency} points = $1 {currency}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        gap: 6,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    inputWrap: {
        flex: 1,
    },
    input: {
        flex: 1,
    },
    arrow: {
        fontSize: 18,
        color: "#475569",
    },
    rateText: {
        fontSize: 12,
        color: "#64748b",
    },
});
