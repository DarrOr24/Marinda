// components/chore-post-modal.tsx
import { Audio } from 'expo-av';
import React from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

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
    // include assignedToIds so edit can prefill
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
    onDeleteTemplate?: (id: string) => void;
    // who can be assigned
    assigneeOptions?: AssigneeOption[];
    canEditPoints?: boolean;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ChorePostModal({
    visible,
    onClose,
    onSubmit,
    initial,
    titleText = 'Post Chore',
    submitText = 'Post',
    templates,
    onDeleteTemplate,
    assigneeOptions,
    canEditPoints = true,
}: Props) {
    const [title, setTitle] = React.useState(initial?.title ?? '');
    const [description, setDescription] = React.useState(initial?.description ?? '');
    const [points, setPoints] = React.useState(String(initial?.points ?? 0));
    const [saveAsTemplate, setSaveAsTemplate] = React.useState(false);
    const [assignedToIds, setAssignedToIds] = React.useState<string[]>(
        initial?.assignedToIds ?? []
    );
    const [recording, setRecording] = React.useState<Audio.Recording | null>(null);
    const [audioUri, setAudioUri] = React.useState<string | null>(null);
    const [audioDuration, setAudioDuration] = React.useState<number | null>(null);

    const [finishByTime, setFinishByTime] = React.useState(
        initial?.expiresAt ? formatTimeForInput(initial.expiresAt) : ''
    )

    React.useEffect(() => {
        setTitle(initial?.title ?? '');
        setDescription(initial?.description ?? '');
        setPoints(String(initial?.points ?? 0));
        setSaveAsTemplate(false);
        setAssignedToIds(initial?.assignedToIds ?? []);
        setRecording(null);
        setAudioUri(null);
        setAudioDuration(null);
        setFinishByTime(initial?.expiresAt ? formatTimeForInput(initial.expiresAt) : '');
    }, [
        initial?.title,
        initial?.description,
        initial?.points,
        initial?.assignedToIds,
        initial?.expiresAt,
        visible,
    ]);

    const disabled = !title.trim() || Number.isNaN(Number(points));

    async function startRecording() {
        try {
            const perm = await Audio.requestPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Permission needed', 'Microphone access is required to record.');
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
            console.error('startRecording error', err);
            Alert.alert('Error', 'Could not start recording.');
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
                'durationMillis' in status && typeof status.durationMillis === 'number'
                    ? Math.round(status.durationMillis / 1000)
                    : null;

            setAudioUri(uri);
            setAudioDuration(durationSeconds);
        } catch (err) {
            console.error('stopRecording error', err);
            Alert.alert('Error', 'Could not stop recording.');
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
            console.error('playRecording error', err);
            Alert.alert('Error', 'Could not play audio.');
        }
    }

    const toggleAssignee = (id: string) => {
        setAssignedToIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.backdrop}
            >
                <View style={styles.card}>
                    <Text style={styles.h1}>{titleText}</Text>

                    <ScrollView
                        style={{ maxHeight: 420 }}                // tweak if you want
                        contentContainerStyle={{ paddingBottom: 8 }}
                        keyboardShouldPersistTaps="handled"
                    >

                        {templates && templates.length > 0 && (
                            <View style={{ marginBottom: 10 }}>
                                <Text style={styles.label}>Choose from routine</Text>
                                <View style={styles.templatesRow}>
                                    {templates.map((t) => (
                                        <View key={t.id} style={styles.templateWrapper}>
                                            <Pressable
                                                style={styles.templateBtn}
                                                onPress={() => {
                                                    setTitle(t.title);
                                                    setPoints(String(t.defaultPoints));
                                                }}
                                            >
                                                <Text style={styles.templateTxt}>{t.title}</Text>
                                            </Pressable>

                                            {onDeleteTemplate && (
                                                <Pressable
                                                    style={styles.deleteChipBtn}
                                                    onPress={() => {
                                                        Alert.alert(
                                                            'Remove routine chore?',
                                                            `Are you sure you want to remove "${t.title}" from the routine list?`,
                                                            [
                                                                { text: 'Cancel', style: 'cancel' },
                                                                {
                                                                    text: 'Remove',
                                                                    style: 'destructive',
                                                                    onPress: () => onDeleteTemplate(t.id),
                                                                },
                                                            ]
                                                        );
                                                    }}
                                                    hitSlop={8}
                                                >
                                                    <Text style={styles.deleteChipTxt}>×</Text>
                                                </Pressable>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="e.g. Empty the dishwasher"
                            style={styles.input}
                        />

                        {canEditPoints && (
                            <>
                                <Text style={styles.label}>Points</Text>
                                <TextInput
                                    value={points}
                                    onChangeText={setPoints}
                                    keyboardType="number-pad"
                                    placeholder="e.g. 10"
                                    style={styles.input}
                                />
                            </>
                        )}

                        <Text style={[styles.label, { marginTop: 8 }]}>
                            Finish by (optional, today)
                        </Text>
                        <TextInput
                            value={finishByTime}
                            onChangeText={setFinishByTime}
                            placeholder="e.g. 7:30 pm or 19:30"
                            style={styles.input}
                        />

                        <Text style={[styles.label, { marginTop: 8 }]}>Description (optional)</Text>
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Add extra details for this chore…"
                            style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                            multiline
                        />

                        <Text style={[styles.label, { marginTop: 8 }]}>
                            Audio description (optional)
                        </Text>

                        <View
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}
                        >
                            {!recording ? (
                                <Pressable
                                    style={[styles.smallBtn, styles.primary]}
                                    onPress={startRecording}
                                >
                                    <Text style={[styles.btnTxt, { color: '#fff', fontSize: 12 }]}>
                                        {audioUri ? 'Re-record' : 'Record audio'}
                                    </Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    style={[styles.smallBtn, styles.cancel]}
                                    onPress={stopRecording}
                                >
                                    <Text style={[styles.btnTxt, styles.cancelTxt, { fontSize: 12 }]}>
                                        Stop
                                    </Text>
                                </Pressable>
                            )}

                            {audioUri && !recording && (
                                <>
                                    <Pressable
                                        style={[styles.smallBtn, styles.secondary]}
                                        onPress={playRecording}
                                    >
                                        <Text style={[styles.btnTxt, { fontSize: 12 }]}>Play</Text>
                                    </Pressable>
                                    {audioDuration != null && (
                                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                                            ~{audioDuration}s
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>

                        {/* Assign to (optional) – multi-select */}
                        {assigneeOptions && assigneeOptions.length > 0 && (
                            <>
                                <Text style={[styles.label, { marginTop: 8 }]}>
                                    Assign to (optional)
                                </Text>
                                <View style={styles.assigneeRow}>
                                    {assigneeOptions.map((opt) => {
                                        const isSelected = assignedToIds.includes(opt.id);
                                        return (
                                            <Pressable
                                                key={opt.id}
                                                onPress={() => toggleAssignee(opt.id)}
                                                style={[
                                                    styles.assigneeChip,
                                                    isSelected && styles.assigneeChipSelected,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.assigneeChipTxt,
                                                        isSelected && styles.assigneeChipTxtSelected,
                                                    ]}
                                                >
                                                    {opt.name}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* Save as routine – still only on create */}
                        {!initial && (
                            <Pressable
                                onPress={() => setSaveAsTemplate(!saveAsTemplate)}
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
                            >
                                <View
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 4,
                                        borderWidth: 2,
                                        borderColor: '#2563eb',
                                        marginRight: 8,
                                        backgroundColor: saveAsTemplate ? '#2563eb' : 'transparent',
                                    }}
                                />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b' }}>
                                    Save as routine
                                </Text>
                            </Pressable>
                        )}

                    </ScrollView>

                    <View style={styles.row}>
                        <Pressable onPress={onClose} style={[styles.btn, styles.secondary]}>
                            <Text style={styles.btnTxt}>Cancel</Text>
                        </Pressable>

                        <Pressable
                            disabled={disabled}
                            onPress={() => {
                                let expiresAt: string | null | undefined = undefined;

                                if (finishByTime.trim()) {
                                    const iso = parseFinishTimeToIso(finishByTime);
                                    if (!iso) {
                                        Alert.alert(
                                            'Check time',
                                            'Please enter a valid time like 7:30 pm or 19:30.'
                                        );
                                        return;
                                    }
                                    expiresAt = iso;
                                }

                                onSubmit({
                                    title: title.trim(),
                                    description: description.trim() || undefined,
                                    points: Number(points),
                                    saveAsTemplate,
                                    assignedToIds:
                                        assignedToIds.length > 0 ? assignedToIds : undefined,
                                    audioLocal:
                                        audioUri && audioDuration != null
                                            ? { uri: audioUri, durationSeconds: audioDuration }
                                            : undefined,
                                    expiresAt, // 🔹 send it out
                                });
                            }}
                            style={[styles.btn, disabled ? styles.disabled : styles.primary]}
                        >
                            <Text style={[styles.btnTxt, { color: '#fff' }]}>{submitText}</Text>
                        </Pressable>

                    </View>

                </View>
            </KeyboardAvoidingView>
        </Modal >
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        gap: 10,
        maxHeight: SCREEN_HEIGHT * 0.82,
    },
    h1: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
    label: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
    },
    row: { flexDirection: 'row', gap: 10, marginTop: 8 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    primary: { backgroundColor: '#2563eb' },
    secondary: { backgroundColor: '#f3f4f6' },
    disabled: { backgroundColor: '#93c5fd' },
    btnTxt: { fontWeight: '800', color: '#111827' },

    templatesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
    },
    templateBtn: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    templateTxt: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1e3a8a',
    },
    templateWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    deleteChipBtn: {
        marginLeft: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteChipTxt: {
        color: '#b91c1c',
        fontSize: 14,
        fontWeight: '900',
        lineHeight: 14,
    },

    // assignee chips
    assigneeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
    },
    assigneeChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f9fafb',
    },
    assigneeChipSelected: {
        backgroundColor: '#2563eb15',
        borderColor: '#2563eb',
    },
    assigneeChipTxt: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
    },
    assigneeChipTxtSelected: {
        color: '#1d4ed8',
    },
    smallBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancel: { backgroundColor: '#fee2e2' },
    cancelTxt: { color: '#b91c1c', fontWeight: '700' },
});

// 🔹 Convert a user-entered time ("7:30 pm", "19:00") into an ISO string for *today*
function parseFinishTimeToIso(input: string): string | null {
    const raw = input.trim().toLowerCase();
    if (!raw) return null;

    let ampm: 'am' | 'pm' | null = null;
    let text = raw;

    if (text.endsWith('am')) {
        ampm = 'am';
        text = text.slice(0, -2).trim();
    } else if (text.endsWith('pm')) {
        ampm = 'pm';
        text = text.slice(0, -2).trim();
    }

    const parts = text.split(':');
    const hourPart = parts[0]?.trim();
    const minutePart = parts[1]?.trim() ?? '0';

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
        if (hour === 12) {
            hour = ampm === 'am' ? 0 : 12;
        } else if (ampm === 'pm') {
            hour += 12;
        }
    }

    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

function formatTimeForInput(ts?: number | null): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

