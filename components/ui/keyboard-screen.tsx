// components/ui/keyboard-screen.tsx
import React from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
    children: React.ReactNode;
    keyboardOffset?: number; // adjust if you have a header
    contentPadding?: number; // base padding (default 16 like your Screen)
};

export function KeyboardScreen({
    children,
    keyboardOffset = Platform.OS === "ios" ? 60 : 0,
    contentPadding = 16,
}: Props) {
    const insets = useSafeAreaInsets();

    return (
        <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={keyboardOffset}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[
                        styles.content,
                        {
                            padding: contentPadding,
                            paddingBottom: 24 + insets.bottom,
                        },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    flex: { flex: 1 },
    content: {},
});
