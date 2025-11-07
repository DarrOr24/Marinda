// components/chore-detail-modal.tsx
import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { Role } from "@/lib/families/families.types";

type Proof = { uri: string; kind: "image" | "video" };
export type ChoreStatus = "open" | "pending" | "approved";

export type ChoreView = {
    id: string;
    title: string;
    points: number;
    status: ChoreStatus;
    // who did the chore (set when kid marks as completed)
    doneById?: string;
    doneByName?: string;
    doneAt?: number;
    // who approved (set on approve)
    approvedById?: string;
    approvedByName?: string;
    // notes + media
    notes?: string;
    proofs?: Proof[];
};

type Props = {
    visible: boolean;
    chore: ChoreView;
    currentRole: Role;
    onClose: () => void;

    onAttachProof: (id: string, proof: Proof | null) => void; // null = clear
    onMarkPending: (id: string) => void;
    onApprove: (id: string, notes?: string) => void;
    onDecline: (id: string, notes?: string) => void;
};

export default function ChoreDetailModal({
    visible,
    chore,
    currentRole,
    onClose,
    onAttachProof,
    onMarkPending,
    onApprove,
    onDecline,
}: Props) {
    const isParent = currentRole === "MOM" || currentRole === "DAD";
    const [notes, setNotes] = useState(chore.notes ?? "");

    React.useEffect(() => setNotes(chore.notes ?? ""), [chore.id, chore.notes]);

    const lastProof = useMemo(
        () =>
            chore.proofs && chore.proofs.length
                ? chore.proofs[chore.proofs.length - 1]
                : undefined,
        [chore.proofs]
    );

    // ---- capture helpers ----
    async function ensureCameraPermission() {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (!cam.granted) {
            alert("Camera permission is required.");
            return false;
        }
        return true;
    }

    async function takePhoto() {
        if (!(await ensureCameraPermission())) return;
        const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
        });
        if (!res.canceled && res.assets?.[0]) {
            onAttachProof(chore.id, { uri: res.assets[0].uri, kind: "image" });
        }
    }

    async function recordVideo() {
        if (!(await ensureCameraPermission())) return;
        const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 0.9 as any,
            videoMaxDuration: 30,
        });
        if (!res.canceled && res.assets?.[0]) {
            onAttachProof(chore.id, { uri: res.assets[0].uri, kind: "video" });
        }
    }

    function removeProof() {
        onAttachProof(chore.id, null);
    }

    // ---- actions ----
    const markCompleted = () => {
        if (!chore.proofs || chore.proofs.length === 0) {
            Alert.alert(
                "Proof required",
                "Please upload a photo or video before marking as completed."
            );
            return;
        }
        onMarkPending(chore.id);
        onClose();
    };

    const approve = () => {
        onApprove(chore.id, notes.trim() || undefined);
        onClose();
    };

    const deny = () => {
        Alert.alert("Deny chore?", "Are you sure you want to deny this?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Yes, deny",
                style: "destructive",
                onPress: () => {
                    onDecline(chore.id, notes.trim() || undefined);
                    onClose();
                },
            },
        ]);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={s.overlay}>
                <View style={s.modal}>
                    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                        <Text style={s.title}>{chore.title}</Text>
                        <Text style={s.status}>{chore.status.toUpperCase()}</Text>
                        <Text style={[s.text, { marginTop: 2 }]}>
                            Worth: <Text style={s.bold}>{chore.points} pts</Text>
                        </Text>

                        {/* OPEN */}
                        {chore.status === "open" && (
                            <>
                                <Text style={[s.text, { marginTop: 10 }]}>
                                    Upload a quick proof (photo or video) to mark as completed.
                                </Text>

                                <View style={s.row}>
                                    <Pressable style={[s.btn, s.secondary]} onPress={takePhoto}>
                                        <Text style={s.btnTxt}>Take photo</Text>
                                    </Pressable>
                                    <Pressable style={[s.btn, s.secondary]} onPress={recordVideo}>
                                        <Text style={s.btnTxt}>Record video</Text>
                                    </Pressable>
                                </View>

                                {/* live preview + remove */}
                                {lastProof && (
                                    <View style={s.proof}>
                                        {lastProof.kind === "image" ? (
                                            <Image source={{ uri: lastProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: lastProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                        <Pressable style={s.removeProof} onPress={removeProof}>
                                            <Text style={s.removeProofTxt}>✕</Text>
                                        </Pressable>
                                    </View>
                                )}

                                <View style={s.row}>
                                    <Pressable style={[s.btn, s.primary]} onPress={markCompleted}>
                                        <Text style={[s.btnTxt, s.primaryTxt]}>Mark as completed</Text>
                                    </Pressable>
                                    <Pressable style={[s.btn, s.cancel]} onPress={onClose}>
                                        <Text style={[s.btnTxt, s.cancelTxt]}>Cancel</Text>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {/* PENDING */}
                        {chore.status === "pending" && (
                            <>
                                {lastProof && (
                                    <View style={s.proof}>
                                        {lastProof.kind === "image" ? (
                                            <Image source={{ uri: lastProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: lastProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                    </View>
                                )}

                                <Text style={[s.text, { marginTop: 6 }]}>
                                    Done by: <Text style={s.bold}>{chore.doneByName ?? "—"}</Text>
                                </Text>
                                <Text style={s.text}>
                                    Time:{" "}
                                    <Text style={s.bold}>
                                        {chore.doneAt
                                            ? new Date(chore.doneAt).toLocaleString()
                                            : "—"}
                                    </Text>
                                </Text>

                                <Text style={[s.text, { marginTop: 12 }]}>Notes</Text>
                                <TextInput
                                    placeholder="Add a note…"
                                    value={notes}
                                    onChangeText={setNotes}
                                    style={s.input}
                                    multiline
                                />

                                <View style={[s.row, { marginTop: 18 }]}>
                                    {isParent && (
                                        <>
                                            <Pressable style={[s.btn, s.cancel]} onPress={deny}>
                                                <Text style={[s.btnTxt, s.cancelTxt]}>Deny</Text>
                                            </Pressable>
                                            <Pressable style={[s.btn, s.primary]} onPress={approve}>
                                                <Text style={[s.btnTxt, s.primaryTxt]}>Approve</Text>
                                            </Pressable>
                                        </>
                                    )}
                                </View>

                                <Pressable
                                    style={[s.btn, s.secondary, { marginTop: 12 }]}
                                    onPress={onClose}
                                >
                                    <Text style={s.btnTxt}>Cancel</Text>
                                </Pressable>
                            </>
                        )}

                        {/* APPROVED */}
                        {chore.status === "approved" && (
                            <>
                                {lastProof && (
                                    <View style={s.proof}>
                                        {lastProof.kind === "image" ? (
                                            <Image source={{ uri: lastProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: lastProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                    </View>
                                )}
                                <Text style={[s.text, { marginTop: 6 }]}>
                                    Done by: <Text style={s.bold}>{chore.doneByName ?? "—"}</Text>
                                </Text>
                                <Text style={s.text}>
                                    Time:{" "}
                                    <Text style={s.bold}>
                                        {chore.doneAt
                                            ? new Date(chore.doneAt).toLocaleString()
                                            : "—"}
                                    </Text>
                                </Text>
                                {chore.approvedByName && (
                                    <Text style={s.text}>
                                        Approved by: <Text style={s.bold}>{chore.approvedByName}</Text>
                                    </Text>
                                )}
                                {chore.notes ? (
                                    <Text style={s.text}>
                                        Notes: <Text style={s.bold}>{chore.notes}</Text>
                                    </Text>
                                ) : null}

                                <Pressable
                                    style={[s.btn, s.secondary, { marginTop: 12 }]}
                                    onPress={onClose}
                                >
                                    <Text style={s.btnTxt}>Close</Text>
                                </Pressable>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    modal: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        maxHeight: "90%",
    },
    title: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
    status: { fontWeight: "700", color: "#64748b", marginTop: 2 },
    text: { color: "#334155" },
    bold: { fontWeight: "700" },
    row: { flexDirection: "row", gap: 12, marginTop: 14 },
    btn: {
        flex: 1,
        borderRadius: 10,
        alignItems: "center",
        paddingVertical: 12,
    },
    primary: { backgroundColor: "#2563eb" },
    primaryTxt: { color: "#fff", fontWeight: "700" },
    secondary: { backgroundColor: "#f1f5f9" },
    cancel: { backgroundColor: "#fee2e2" },
    cancelTxt: { color: "#b91c1c", fontWeight: "700" },
    btnTxt: { fontWeight: "700", color: "#1e293b" },
    proof: { marginTop: 12 },
    media: {
        width: "100%",
        height: 220,
        borderRadius: 12,
        backgroundColor: "#e2e8f0",
    },
    removeProof: {
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
    removeProofTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
    input: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        padding: 10,
        minHeight: 44,
        textAlignVertical: "top",
        backgroundColor: "#fff",
    },
});
