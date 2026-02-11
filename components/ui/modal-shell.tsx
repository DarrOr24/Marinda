// components/ui/modal-shell.tsx
import React from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
    ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    backdropStyle?: ViewProps["style"];
    keyboardOffset?: number; // tweak per app header if needed
};

export function ModalShell({
    visible,
    onClose,
    children,
    backdropStyle,
    keyboardOffset = 0,
}: Props) {
    const insets = useSafeAreaInsets();

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose} />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={keyboardOffset}
                style={[
                    styles.backdrop,
                    {
                        paddingTop: 16 + insets.top,
                        paddingBottom: 16 + insets.bottom,
                    },
                    backdropStyle,
                ]}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.content}>{children}</View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
    backdrop: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    content: { flex: 1, width: "100%", minHeight: 0 },
});
