// components/StarButton.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
    label: string;
    onPress?: () => void;
    style?: ViewStyle;
};

export default function StarButton({ label, onPress, style }: Props) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.wrap, pressed && styles.pressed, style]}
            android_ripple={{ color: '#00000010', borderless: false }}
            hitSlop={10}
        >
            {/* Star shape */}
            <Svg width={120} height={120} viewBox="0 0 100 100">
                <Path
                    d="M50 5l12.9 26.2 28.9 4.2-20.9 20.4 4.9 28.7L50 72.8 24.2 84.5l4.9-28.7L8.2 35.4l28.9-4.2L50 5z"
                    fill="#FFD95A"
                    stroke="#E5A100"
                    strokeWidth={2}
                />
            </Svg>
            <Text style={styles.label}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center' },
    pressed: { opacity: 0.85 },
    label: { marginTop: 6, fontSize: 14, fontWeight: '600', color: '#334155' },
});
