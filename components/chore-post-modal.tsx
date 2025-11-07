// components/chore-post-modal.tsx
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    onSubmit: (payload: { title: string; points: number }) => void;
    initial?: { title?: string; points?: number };
};

export default function ChorePostModal({ visible, onClose, onSubmit, initial }: Props) {
    const [title, setTitle] = useState(initial?.title ?? '');
    const [points, setPoints] = useState(String(initial?.points ?? 10));

    useEffect(() => {
        if (visible) {
            setTitle(initial?.title ?? '');
            setPoints(String(initial?.points ?? 10));
        }
    }, [visible]);

    const disabled = !title.trim() || Number.isNaN(Number(points));

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.h1}>Post a Chore</Text>

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

                    <View style={styles.row}>
                        <Pressable onPress={onClose} style={[styles.btn, styles.secondary]}>
                            <Text style={styles.btnTxt}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            disabled={disabled}
                            onPress={() => onSubmit({ title: title.trim(), points: Number(points) })}
                            style={[styles.btn, disabled ? styles.disabled : styles.primary]}
                        >
                            <Text style={[styles.btnTxt, { color: '#fff' }]}>Post</Text>
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
});
