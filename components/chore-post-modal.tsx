// components/chore-post-modal.tsx
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    onSubmit: (payload: { title: string; points: number; saveAsTemplate?: boolean }) => void;
    initial?: { title?: string; points?: number };
    titleText?: string;      // e.g., "Edit Chore"
    submitText?: string;
    templates?: { id: string; title: string; defaultPoints: number }[];
};

export default function ChorePostModal({
    visible,
    onClose,
    onSubmit,
    initial,
    titleText = 'Post Chore',
    submitText = 'Post',
    templates,   // 👈 ADD THIS
}: Props) {
    const [title, setTitle] = React.useState(initial?.title ?? '');
    const [points, setPoints] = React.useState(String(initial?.points ?? 5));
    const [saveAsTemplate, setSaveAsTemplate] = React.useState(false);

    React.useEffect(() => {
        setTitle(initial?.title ?? '');
        setPoints(String(initial?.points ?? 5));
    }, [initial?.title, initial?.points, visible]);

    const disabled = !title.trim() || Number.isNaN(Number(points));

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.h1}>Post a Chore</Text>

                    {templates && templates.length > 0 && (
                        <View style={{ marginBottom: 10 }}>
                            <Text style={styles.label}>Choose from routine</Text>
                            <View style={styles.templatesRow}>
                                {templates.map((t) => (
                                    <Pressable
                                        key={t.id}
                                        style={styles.templateBtn}
                                        onPress={() => {
                                            setTitle(t.title);
                                            setPoints(String(t.defaultPoints));
                                        }}
                                    >
                                        <Text style={styles.templateTxt}>{t.title}</Text>
                                    </Pressable>
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
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10 },
    h1: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
    label: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
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

});
