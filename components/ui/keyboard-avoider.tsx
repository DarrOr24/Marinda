// components/ui/keyboard-avoider.tsx
import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

type Props = {
    children: React.ReactNode;
    keyboardOffset?: number; // set if you have a header
    behavior?: "padding" | "height" | "position";
};

export function KeyboardAvoider({
    children,
    keyboardOffset = Platform.OS === "ios" ? 60 : 0,
    behavior = Platform.OS === "ios" ? "padding" : "height",
}: Props) {
    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={behavior}
            keyboardVerticalOffset={keyboardOffset}
        >
            {children}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
});
