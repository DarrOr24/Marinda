// components/feature-tile.tsx
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

type Family = 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome5';

type Props = {
    label: string;
    onPress?: () => void;
    style?: ViewStyle;
    icon: { family?: Family; name: string; size?: number; color?: string };
};

export default function FeatureTile({ label, onPress, style, icon }: Props) {
    const { family = 'MaterialCommunityIcons', name, size = 44, color = '#334155' } = icon;

    const IconComp =
        family === 'Ionicons' ? Ionicons :
            family === 'FontAwesome5' ? FontAwesome5 :
                MaterialCommunityIcons;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.wrap, pressed && styles.pressed, style]}
            android_ripple={{ color: '#00000010' }}
        >
            <View style={styles.iconBadge}>
                <IconComp name={name as any} size={size} color={color} />
            </View>
            <Text style={styles.label}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center', gap: 8 },
    pressed: { opacity: 0.9 },
    iconBadge: {
        width: 92, height: 92, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderWidth: 1, borderColor: '#e5e7eb',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    label: { fontSize: 14, fontWeight: '600', color: '#334155' },
});
