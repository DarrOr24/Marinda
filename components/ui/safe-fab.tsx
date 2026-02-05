// components/ui/safe-fab.tsx
import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = ViewProps & {
    bottomOffset?: number;
    rightOffset?: number;
};

export function SafeFab({
    style,
    bottomOffset = 16,
    rightOffset = 20,
    ...props
}: Props) {
    const insets = useSafeAreaInsets();

    return (
        <View
            pointerEvents="box-none"
            {...props}
            style={[
                styles.wrap,
                { paddingBottom: bottomOffset + insets.bottom, paddingRight: rightOffset },
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "flex-end",
    },
});
