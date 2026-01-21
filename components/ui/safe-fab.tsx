import React from "react";
import { StyleSheet, TouchableOpacity, TouchableOpacityProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = TouchableOpacityProps & {
    bottomOffset?: number; // extra lift above safe area
    right?: number;
};

export function SafeFab({
    style,
    bottomOffset = 16,
    right = 20,
    ...props
}: Props) {
    const insets = useSafeAreaInsets();

    return (
        <TouchableOpacity
            {...props}
            style={[
                styles.fab,
                { right, bottom: bottomOffset + insets.bottom },
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    fab: {
        position: "absolute",
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
    },
});
