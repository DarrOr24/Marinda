import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
    label: string;
    value?: React.ReactNode;
    children?: React.ReactNode;
    /** Vertical spacing after this row (default: 6) */
    spacing?: number;
};

/**
 * Reusable label/value row for modal metadata (Done by, Time, etc.).
 * Use across chore, grocery, and other modals for consistent layout.
 */
export function MetaRow({ label, value, children, spacing = 6 }: Props) {
    const content = value ?? children;
    return (
        <View style={[styles.row, { marginBottom: spacing }]}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{content}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {},
    label: { fontSize: 12, color: '#64748b', marginBottom: 2 },
    value: { fontSize: 16, color: '#0f172a' },
});
