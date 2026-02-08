// components/ui/keyboard-frame.tsx
import React from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
} from "react-native";

type Props = {
    children: React.ReactNode;
    keyboardOffset?: number;
    behavior?: "padding" | "height" | "position";
    dismissOnPress?: boolean;
};

export function KeyboardFrame({
    children,
    keyboardOffset = Platform.OS === "ios" ? 60 : 0,
    behavior = Platform.OS === "ios" ? "padding" : "height",
    dismissOnPress = true,
}: Props) {
    const content = <View style={styles.flex}>{children}</View>;

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={behavior}
            keyboardVerticalOffset={keyboardOffset}
        >
            {dismissOnPress ? (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    {content}
                </TouchableWithoutFeedback>
            ) : (
                content
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
});
