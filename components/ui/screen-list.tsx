// components/ui/screen-list.tsx
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CheckerboardBackground from "../checkerboard-background";

type Props = {
    children: React.ReactNode;
    edges?: ("top" | "right" | "bottom" | "left")[];
    style?: ViewStyle;
    withBackground?: boolean;
};

export function ScreenList({
    children,
    edges = ["left", "right", "bottom"],
    style,
    withBackground = false,
}: Props) {
    return (
        <SafeAreaView style={[styles.screen, style]} edges={edges}>
            {withBackground && (
                <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />
            )}
            <View style={styles.flex}>{children}</View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F7FBFF" },
    flex: { flex: 1 },
});
