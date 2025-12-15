// components/media-picker.tsx
import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

export type PickedMedia = {
    uri: string;
    kind: "image" | "video";
};

type Props = {
    label?: string;
    value: PickedMedia | null;
    onChange: (media: PickedMedia | null) => void;
    required?: boolean;
    allowImage?: boolean;
    allowVideo?: boolean;
    pickFromLibrary?: boolean;
};

export default function MediaPicker({
    label,
    value,
    onChange,
    required = false,
    allowImage = true,
    allowVideo = true,
    pickFromLibrary = true,
}: Props) {
    async function ensureCameraPermission() {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
            Alert.alert("Permission needed", "Camera permission is required.");
        }
        return granted;
    }

    // --- CAMERA: take photo ---
    const takePhoto = useCallback(async () => {
        if (!(await ensureCameraPermission())) return;

        const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.9,
        });

        if (!res.canceled && res.assets?.[0]) {
            onChange({ uri: res.assets[0].uri, kind: "image" });
        }
    }, []);

    // --- CAMERA: record video ---
    const recordVideo = useCallback(async () => {
        if (!(await ensureCameraPermission())) return;

        const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ['videos'],
            quality: 0.9,
            videoMaxDuration: 30,
        });

        if (!res.canceled && res.assets?.[0]) {
            onChange({ uri: res.assets[0].uri, kind: "video" });
        }
    }, []);

    // --- GALLERY: pick image ---
    const pickImageFromLibrary = useCallback(async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.9,
        });

        if (!res.canceled && res.assets?.[0]) {
            onChange({ uri: res.assets[0].uri, kind: "image" });
        }
    }, []);

    // --- GALLERY: pick video ---
    const pickVideoFromLibrary = useCallback(async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            quality: 0.9,
        });

        if (!res.canceled && res.assets?.[0]) {
            onChange({ uri: res.assets[0].uri, kind: "video" });
        }
    }, []);

    // Popups
    const openImageOptions = useCallback(() => {
        if (pickFromLibrary) {
            Alert.alert("Photo", undefined, [
                { text: "Choose from gallery", onPress: pickImageFromLibrary },
                { text: "Take photo", onPress: takePhoto },
                { text: "Cancel", style: "cancel" },
            ]);
        } else {
            takePhoto();
        }
    }, [pickFromLibrary, pickImageFromLibrary, takePhoto]);


    const openVideoOptions = useCallback(() => {
        if (pickFromLibrary) {
            Alert.alert("Video", undefined, [
                { text: "Choose from gallery", onPress: pickVideoFromLibrary },
                { text: "Record video", onPress: recordVideo },
                { text: "Cancel", style: "cancel" },
            ]);
        } else {
            recordVideo();
        }
    }, [pickFromLibrary, pickVideoFromLibrary, recordVideo]);

    return (
        <View style={{ marginTop: 16 }}>
            {label && (
                <Text style={styles.label}>
                    {label} {required ? "(required)" : "(optional)"}
                </Text>
            )}

            <View style={styles.row}>
                {allowImage && (
                    <Pressable style={[styles.btn, styles.secondary]} onPress={openImageOptions}>
                        <Text style={styles.btnTxt}>
                            {value?.kind === "image" ? "Change photo" : "Add photo"}
                        </Text>
                    </Pressable>
                )}

                {allowVideo && (
                    <Pressable style={[styles.btn, styles.secondary]} onPress={openVideoOptions}>
                        <Text style={styles.btnTxt}>
                            {value?.kind === "video" ? "Change video" : "Add video"}
                        </Text>
                    </Pressable>
                )}
            </View>

            {value?.uri && (
                <View style={styles.preview}>
                    {value.kind === "image" ? (
                        <Image source={{ uri: value.uri }} style={styles.media} />
                    ) : (
                        <Video
                            source={{ uri: value.uri }}
                            style={styles.media}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                        />
                    )}

                    <Pressable style={styles.remove} onPress={() => onChange(null)}>
                        <Text style={styles.removeTxt}>✕</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    label: { color: "#334155", marginBottom: 4 },
    row: { flexDirection: "row", gap: 12 },
    btn: {
        flex: 1,
        borderRadius: 10,
        alignItems: "center",
        paddingVertical: 12,
    },
    secondary: { backgroundColor: "#f1f5f9" },
    btnTxt: { fontWeight: "700", color: "#1e293b" },
    preview: { marginTop: 12 },
    media: {
        width: "100%",
        height: 220,
        borderRadius: 12,
        backgroundColor: "#e2e8f0",
    },
    remove: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 16,
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    removeTxt: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 16,
    },
});
