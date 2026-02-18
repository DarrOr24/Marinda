// components/chore-post-modal.tsx
import { Audio } from "expo-av";
import React from "react";
import {
    Alert,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

import { Button, ModalCard, ModalShell, TextInput, useModalScrollMaxHeight } from "@/components/ui";
import { MembersSelector } from "../members-selector";


type AssigneeOption = {
    id: string;
    name: string;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    onSubmit: (payload: {
        title: string;
        description?: string;
        points: number;
        saveAsTemplate?: boolean;
        assignedToIds?: string[];
        audioLocal?: { uri: string; durationSeconds: number };
        expiresAt?: string | null;
    }) => void;

    initial?: {
        title?: string;
        description?: string | null;
        points?: number;
        assignedToIds?: string[] | null;
        expiresAt?: number | null;
    };

    titleText?: string; // e.g., "Edit Chore"
    submitText?: string;

    templates?: { id: string; title: string; defaultPoints: number }[];
    assigneeOptions?: AssigneeOption[];
    canEditPoints?: boolean;
};


export default function ChorePostModal({
    visible,
    onClose,
    onSubmit,
    initial,
    titleText = "Post Chore",
    submitText = "Post",
    templates,
    assigneeOptions,
    canEditPoints = true,
}: Props) {
    const scrollMaxHeight = useModalScrollMaxHeight(140);
    const [title, setTitle] = React.useState(initial?.title ?? "");
    const [description, setDescription] = React.useState(initial?.description ?? "");
    const [points, setPoints] = React.useState(String(initial?.points ?? 0));
    const [saveAsTemplate, setSaveAsTemplate] = React.useState(false);
    const [assignedToIds, setAssignedToIds] = React.useState<string[]>(
        initial?.assignedToIds ?? []
    );

    const [recording, setRecording] = React.useState<Audio.Recording | null>(null);
    const [audioUri, setAudioUri] = React.useState<string | null>(null);
    const [audioDuration, setAudioDuration] = React.useState<number | null>(null);

    const [finishByTime, setFinishByTime] = React.useState(
        initial?.expiresAt ? formatTimeForInput(initial.expiresAt) : ""
    );

    const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
    const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = React.useState(false);

    const selectedTemplate = React.useMemo(
        () => templates?.find((t) => t.id === selectedTemplateId),
        [templates, selectedTemplateId]
    );

    React.useEffect(() => {
        if (!visible) return;

        setTitle(initial?.title ?? "");
        setDescription(initial?.description ?? "");
        setPoints(String(initial?.points ?? 0));
        setSaveAsTemplate(false);
        setAssignedToIds(initial?.assignedToIds ?? []);

        setRecording(null);
        setAudioUri(null);
        setAudioDuration(null);

        setFinishByTime(initial?.expiresAt ? formatTimeForInput(initial.expiresAt) : "");

        setSelectedTemplateId(null);
        setIsTemplateDropdownOpen(false);
    }, [
        visible,
        initial?.title,
        initial?.description,
        initial?.points,
        initial?.assignedToIds,
        initial?.expiresAt,
    ]);

    const disabled = !title.trim() || Number.isNaN(Number(points));

    const handleTitleChange = (text: string) => {
        setTitle(text);
        if (selectedTemplate && text !== selectedTemplate.title) {
            setSelectedTemplateId(null);
        }
    };

    async function startRecording() {
        try {
            const perm = await Audio.requestPermissionsAsync();
            if (!perm.granted) {
                Alert.alert("Permission needed", "Microphone access is required to record.");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
        } catch (err) {
            console.error("startRecording error", err);
            Alert.alert("Error", "Could not start recording.");
        }
    }

    async function stopRecording() {
        if (!recording) return;
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            if (!uri) return;

            const status = await recording.getStatusAsync();
            const durationSeconds =
                "durationMillis" in status && typeof status.durationMillis === "number"
                    ? Math.round(status.durationMillis / 1000)
                    : null;

            setAudioUri(uri);
            setAudioDuration(durationSeconds);
        } catch (err) {
            console.error("stopRecording error", err);
            Alert.alert("Error", "Could not stop recording.");
        } finally {
            setRecording(null);
        }
    }

    async function playRecording() {
        if (!audioUri) return;
        try {
            const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
            await sound.playAsync();
        } catch (err) {
            console.error("playRecording error", err);
            Alert.alert("Error", "Could not play audio.");
        }
    }

    return (
        <ModalShell visible={visible} onClose={onClose} keyboardOffset={40}>

            <ModalCard bottomPadding={12} maxHeightPadding={24} style={styles.card}>

                <Text style={styles.h1}>{titleText}</Text>

                <ScrollView
                    style={{ maxHeight: scrollMaxHeight }}
                    contentContainerStyle={{ paddingBottom: 16, flexGrow: 0 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Routine chores as dropdown */}
                    {templates && templates.length > 0 && (
                        <View style={{ marginBottom: 10 }}>
                            <Text style={styles.label}>Choose from routine</Text>

                            <Pressable
                                style={styles.dropdown}
                                onPress={() => setIsTemplateDropdownOpen((prev) => !prev)}
                            >
                                <Text
                                    style={selectedTemplate ? styles.dropdownValue : styles.dropdownPlaceholder}
                                >
                                    {selectedTemplate ? selectedTemplate.title : "Select a routine chore"}
                                </Text>
                                <Text style={styles.dropdownChevron}>
                                    {isTemplateDropdownOpen ? "▲" : "▼"}
                                </Text>
                            </Pressable>

                            {isTemplateDropdownOpen && (
                                <View style={styles.dropdownList}>
                                    <ScrollView nestedScrollEnabled>
                                        {/* "None" option */}
                                        <View style={styles.dropdownItemRow}>
                                            <Pressable
                                                style={styles.dropdownItemBtn}
                                                onPress={() => {
                                                    setSelectedTemplateId(null);
                                                    setIsTemplateDropdownOpen(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownItemTxt}>None</Text>
                                            </Pressable>
                                        </View>

                                        {templates.map((t) => (
                                            <View key={t.id} style={styles.dropdownItemRow}>
                                                <Pressable
                                                    style={styles.dropdownItemBtn}
                                                    onPress={() => {
                                                        setSelectedTemplateId(t.id);
                                                        setTitle(t.title);
                                                        setPoints(String(t.defaultPoints));
                                                        setIsTemplateDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={styles.dropdownItemTxt}>{t.title}</Text>
                                                    <Text style={styles.dropdownItemPoints}>
                                                        {t.defaultPoints} pts
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    )}

                    <TextInput
                        label="Title"
                        value={title}
                        onChangeText={handleTitleChange}
                        placeholder="e.g. Empty the dishwasher"
                        returnKeyType="done"
                        submitBehavior="submit"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />

                    {canEditPoints && (
                        <TextInput
                            label="Points"
                            value={points}
                            onChangeText={setPoints}
                            keyboardType="number-pad"
                            placeholder="e.g. 10"
                            containerStyle={{ marginTop: 8 }}
                            returnKeyType="done"
                            submitBehavior="submit"
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                    )}

                    <TextInput
                        label="Finish by (optional, today)"
                        value={finishByTime}
                        onChangeText={setFinishByTime}
                        placeholder="e.g. 7:30 pm or 19:30"
                        containerStyle={{ marginTop: 8 }}
                        returnKeyType="done"
                        submitBehavior="submit"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />

                    <TextInput
                        label="Description (optional)"
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Add extra details for this chore…"
                        multiline
                        containerStyle={{ marginTop: 8 }}
                        submitBehavior="submit"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />

                    <Text style={[styles.label, { marginTop: 8 }]}>Audio description (optional)</Text>

                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
                        {!recording ? (
                            <Button
                                type="primary"
                                size="sm"
                                title={audioUri ? "Re-record" : "Record audio"}
                                onPress={startRecording}
                            />
                        ) : (
                            <Button type="danger" size="sm" title="Stop" onPress={stopRecording} />
                        )}

                        {audioUri && !recording && (
                            <>
                                <Button type="secondary" size="sm" title="Play" onPress={playRecording} />

                                {audioDuration != null && (
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>~{audioDuration}s</Text>
                                )}
                            </>
                        )}
                    </View>

                    {assigneeOptions && assigneeOptions.length > 0 && (
                        <>
                            <Text style={[styles.label, { marginTop: 8 }]}>Assign to (optional)</Text>
                            <MembersSelector values={assignedToIds} onChange={setAssignedToIds} />
                        </>
                    )}

                    {!initial && (
                        <Pressable
                            onPress={() => setSaveAsTemplate(!saveAsTemplate)}
                            style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
                        >
                            <View
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 4,
                                    borderWidth: 2,
                                    borderColor: "#2563eb",
                                    marginRight: 8,
                                    backgroundColor: saveAsTemplate ? "#2563eb" : "transparent",
                                }}
                            />
                            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b" }}>
                                Save as routine
                            </Text>
                        </Pressable>
                    )}
                </ScrollView>

                <View style={styles.row}>
                    <Button type="outline" size="sm" title="Cancel" onPress={onClose} style={styles.flex1} />
                    <Button
                        type="primary"
                        size="sm"
                        title={submitText}
                        disabled={disabled}
                        onPress={() => {
                            let expiresAt: string | null | undefined = undefined;

                            if (finishByTime.trim()) {
                                const iso = parseFinishTimeToIso(finishByTime);
                                if (!iso) {
                                    Alert.alert("Check time", "Please enter a valid time like 7:30 pm or 19:30.");
                                    return;
                                }
                                expiresAt = iso;
                            }

                            onSubmit({
                                title: title.trim(),
                                description: description.trim() || undefined,
                                points: Number(points),
                                saveAsTemplate,
                                assignedToIds: assignedToIds.length > 0 ? assignedToIds : undefined,
                                audioLocal:
                                    audioUri && audioDuration != null
                                        ? { uri: audioUri, durationSeconds: audioDuration }
                                        : undefined,
                                expiresAt,
                            });

                            Keyboard.dismiss();
                        }}
                        style={styles.flex1}
                    />
                </View>
            </ModalCard>
        </ModalShell>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        maxWidth: 460,
        gap: 10,
    },
    h1: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
    label: { fontSize: 12, fontWeight: "700", color: "#64748b" },
    row: { flexDirection: "row", gap: 10, marginTop: 8 },
    flex1: { flex: 1 },

    dropdown: {
        marginTop: 6,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dropdownValue: { fontSize: 14, color: "#111827", fontWeight: "600" },
    dropdownPlaceholder: { fontSize: 14, color: "#9ca3af" },
    dropdownChevron: { fontSize: 12, color: "#6b7280", marginLeft: 8 },
    dropdownList: {
        marginTop: 6,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        paddingVertical: 4,
        backgroundColor: "#f9fafb",
        maxHeight: 200,
    },
    dropdownItemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
    dropdownItemBtn: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dropdownItemTxt: { fontSize: 14, color: "#111827", fontWeight: "600" },
    dropdownItemPoints: { fontSize: 12, color: "#6b7280", marginLeft: 8 },

});

// Convert a user-entered time ("7:30 pm", "19:00") into an ISO string for today
function parseFinishTimeToIso(input: string): string | null {
    const raw = input.trim().toLowerCase();
    if (!raw) return null;

    let ampm: "am" | "pm" | null = null;
    let text = raw;

    if (text.endsWith("am")) {
        ampm = "am";
        text = text.slice(0, -2).trim();
    } else if (text.endsWith("pm")) {
        ampm = "pm";
        text = text.slice(0, -2).trim();
    }

    const parts = text.split(":");
    const hourPart = parts[0]?.trim();
    const minutePart = parts[1]?.trim() ?? "0";

    let hour = Number.parseInt(hourPart, 10);
    let minute = Number.parseInt(minutePart, 10);

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    if (ampm) {
        if (hour === 12) hour = ampm === "am" ? 0 : 12;
        else if (ampm === "pm") hour += 12;
    }

    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

function formatTimeForInput(ts?: number | null): string {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
