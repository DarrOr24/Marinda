// components/Sidebar.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type Member = { id: string; name: string; role?: 'mom' | 'dad' | 'child' | 'teen' };

export default function Sidebar({ members }: { members: Member[] }) {
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {members.map((m, idx) => {
                    const { iconName, iconColor, bgColor } = getStyleForMember(m, idx);
                    return (
                        <TouchableOpacity key={m.id} style={styles.item} onPress={() => { /* TODO: open profile */ }}>
                            <View style={[styles.avatarCircle, { backgroundColor: bgColor }]}>
                                <MaterialCommunityIcons name={iconName as any} size={30} color={iconColor} />
                            </View>
                            <Text numberOfLines={1} style={styles.name}>{m.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

function getStyleForMember(m: Member, index: number) {
    // alternate soft tones when there are multiple children
    const childColors = ['#EAF9E8', '#E3EEFF', '#FDF4FF'];

    switch (m.role) {
        case 'mom':
            return {
                iconName: 'face-woman',        // nicer than human-female
                iconColor: '#db2777',          // rose
                bgColor: '#fde2f3',
            };
        case 'dad':
            return {
                iconName: 'face-man',          // nicer than human-male
                iconColor: '#2563eb',          // blue
                bgColor: '#dbeafe',
            };
        case 'teen':
            return {
                iconName: 'emoticon-cool-outline', // sunglasses vibe
                iconColor: '#f59e0b',          // amber
                bgColor: '#fef3c7',
            };
        case 'child':
        default:
            return {
                iconName: 'baby-face-outline',
                iconColor: '#22c55e',          // green
                bgColor: childColors[index % childColors.length],
            };
    }
}

const SIDEBAR_WIDTH = 92;

const styles = StyleSheet.create({
    container: {
        width: SIDEBAR_WIDTH,
        alignSelf: 'stretch',
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRightWidth: 1,
        borderRightColor: '#d9e1f2',
    },
    list: {
        gap: 14,
        flexGrow: 1,
        justifyContent: 'center', // vertical center
        paddingVertical: 12,
    },
    item: { alignItems: 'center' },
    avatarCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: { marginTop: 6, fontSize: 11, color: '#334155', maxWidth: 72, textAlign: 'center' },
});
