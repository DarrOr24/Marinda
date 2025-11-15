// components/chore-post-modal.tsx
import React from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
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
        points: number;
        saveAsTemplate?: boolean;
        assignedToId?: string;
    }) => void;
    // 🔹 include assignedToId so edit can prefill
    initial?: { title?: string; points?: number; assignedToId?: string | null };
    titleText?: string; // e.g., "Edit Chore"
    submitText?: string;
    templates?: { id: string; title: string; defaultPoints: number }[];
    onDeleteTemplate?: (id: string) => void;
    // who can be assigned
    assigneeOptions?: AssigneeOption[];
};

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
}: Props) {
    const [title, setTitle] = React.useState(initial?.title ?? '');
    const [points, setPoints] = React.useState(String(initial?.points ?? 5));
    const [saveAsTemplate, setSaveAsTemplate] = React.useState(false);
    const [assignedToId, setAssignedToId] = React.useState<string | null>(
        initial?.assignedToId ?? null
    );

    React.useEffect(() => {
        setTitle(initial?.title ?? '');
        setPoints(String(initial?.points ?? 5));
        setSaveAsTemplate(false);
        setAssignedToId(initial?.assignedToId ?? null);
    }, [initial?.title, initial?.points, initial?.assignedToId, visible]);

    const disabled = !title.trim() || Number.isNaN(Number(points));

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.backdrop}
            >
                <View style={styles.card}>
                    <Text style={styles.h1}>{titleText}</Text>

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

                    <Text style={styles.label}>Points</Text>
                    <TextInput
                        value={points}
                        onChangeText={setPoints}
                        keyboardType="number-pad"
                        placeholder="e.g. 10"
                        style={styles.input}
                    />

                    {/* Assign to (optional) – now also shown for EDIT */}
                    {assigneeOptions && assigneeOptions.length > 0 && (
                        <>
                            <Text style={[styles.label, { marginTop: 8 }]}>Assign to (optional)</Text>
                            <View style={styles.assigneeRow}>
                                {assigneeOptions.map((opt) => {
                                    const isSelected = assignedToId === opt.id;
                                    return (
                                        <Pressable
                                            key={opt.id}
                                            onPress={() =>
                                                setAssignedToId((prev) => (prev === opt.id ? null : opt.id))
                                            }
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

                    <View style={styles.row}>
                        <Pressable onPress={onClose} style={[styles.btn, styles.secondary]}>
                            <Text style={styles.btnTxt}>Cancel</Text>
                        </Pressable>

                        <Pressable
                            disabled={disabled}
                            onPress={() =>
                                onSubmit({
                                    title: title.trim(),
                                    points: Number(points),
                                    saveAsTemplate,
                                    assignedToId: assignedToId ?? undefined,
                                })
                            }
                            style={[styles.btn, disabled ? styles.disabled : styles.primary]}
                        >
                            <Text style={[styles.btnTxt, { color: '#fff' }]}>{submitText}</Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        padding: 16,
    },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10 },
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
});
