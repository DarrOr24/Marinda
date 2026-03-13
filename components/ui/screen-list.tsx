// components/ui/screen-list.tsx
import React from "react";
import { StyleSheet, View, ViewStyle, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CheckerboardBackground from "../checkerboard-background";

type Gap = "no" | "sm" | "md" | "lg";

type Props = {
    children: React.ReactNode;
    edges?: ("top" | "right" | "bottom" | "left")[];
    style?: ViewStyle;
    withBackground?: boolean;
    gap?: Gap;
    contentStyle?: ViewStyle;
    scrollable?: boolean;
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
    scrollable = false,
}: Props) {
    const contentStyles = [{ gap: gapToNumber[gap] }, contentStyle];

    return (
        <SafeAreaView style={[styles.screen, style]} edges={edges}>
            {withBackground && (
                <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />
            )}

            <View style={styles.flex}>
                {scrollable ? (
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[styles.scrollContent, contentStyles]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {children}
                    </ScrollView>
                ) : (
                    <View style={[{ flex: 1 }, contentStyles]}>
                        {children}
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F7FBFF" },
    flex: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
});
