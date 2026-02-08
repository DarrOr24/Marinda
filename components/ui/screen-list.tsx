// components/ui/screen-list.tsx
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CheckerboardBackground from "../checkerboard-background";

type Gap = "no" | "sm" | "md" | "lg";

type Props = {
    children: React.ReactNode;
    edges?: ("top" | "right" | "bottom" | "left")[];
    style?: ViewStyle;
    withBackground?: boolean;

    // ✅ add this
    gap?: Gap;
    contentStyle?: ViewStyle; // ✅ optional, nice for screens like announcements
};

const gapToNumber: Record<Gap, number> = {
    no: 0,
    sm: 8,
    md: 16,
    lg: 24,
};

export function ScreenList({
    children,
    edges = ["left", "right", "bottom"],
    style,
    withBackground = false,

    gap = "no",
    contentStyle,
}: Props) {
    return (
        <SafeAreaView style={[styles.screen, style]} edges={edges}>
            {withBackground && (
                <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />
            )}

            <View style={styles.flex}>
                <View style={[{ flex: 1, gap: gapToNumber[gap] }, contentStyle]}>
                    {children}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F7FBFF" },
    flex: { flex: 1 },
});
