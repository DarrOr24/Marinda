// components/sticky-note.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
    children: React.ReactNode;
    /** Background color of the sticky note */
    backgroundColor?: string;
    /** Left border accent color */
    borderLeftColor?: string;
    style?: ViewStyle;
};

/**
 * Bulletin-board style sticky note with pins at the top corners.
 */
export function StickyNote({
    children,
    backgroundColor = '#fef9c3',
    borderLeftColor = '#facc15',
    style,
}: Props) {
    return (
        <View style={[styles.wrapper, style]}>
            {/* Pins outside card so they're not clipped — absolute, high zIndex */}
            <Ionicons
                name="pin"
                size={24}
                color="#78716c"
                style={[styles.pin, styles.pinTopLeft]}
            />
            <Ionicons
                name="pin"
                size={24}
                color="#78716c"
                style={[styles.pin, styles.pinTopRight]}
            />

            <View
                style={[
                    styles.card,
                    { backgroundColor, borderLeftColor },
                ]}
            >
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'relative',
        overflow: 'visible',
    },
    card: {
        padding: 14,
        paddingTop: 12,
        paddingBottom: 14,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    pin: {
        position: 'absolute',
        zIndex: 9999,
        elevation: 9999,
    },
    pinTopLeft: {
        top: -16,
        left: -5,
    },
    pinTopRight: {
        top: -16,
        right: -5,
    },
});
