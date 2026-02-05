import React from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CheckerboardBackground from "../checkerboard-background";

type Gap = "no" | "sm" | "md" | "lg";

type Props = {
    left: React.ReactNode;
    children: React.ReactNode;

    edges?: ("top" | "right" | "bottom" | "left")[];
    withBackground?: boolean;

    contentPadding?: number;
    gap?: Gap;

    style?: ViewStyle;
    contentStyle?: ViewStyle;
};

const gapToNumber: Record<Gap, number> = {
    no: 0,
    sm: 8,
    md: 16,
    lg: 24,
};

export function SplitScreen({
    left,
    children,
    edges = ["left", "right", "bottom"],
    withBackground = false,
    contentPadding = 16,
    gap = "md",
    style,
    contentStyle,
}: Props) {
    return (
        <SafeAreaView style={[styles.screen, style]} edges={edges}>
            {withBackground && (
                <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />
            )}

            <View style={styles.row}>
                {left}

                <ScrollView
                    style={styles.right}
                    contentContainerStyle={[
                        styles.rightContent,
                        { padding: contentPadding, gap: gapToNumber[gap] },
                        contentStyle,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F7FBFF" },
    row: { flex: 1, flexDirection: "row" },
    right: { flex: 1 },
    rightContent: { flexGrow: 1 },
});
