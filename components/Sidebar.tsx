// components/Sidebar.tsx
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type Member = { id: string; name: string; avatarUrl?: string };

export default function Sidebar({ members }: { members: Member[] }) {
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.list}>
                {members.map((m) => (
                    <TouchableOpacity key={m.id} style={styles.item} onPress={() => { /* later */ }}>
                        <Image
                            source={{ uri: m.avatarUrl ?? 'https://i.pravatar.cc/100' }}
                            style={styles.avatar}
                        />
                        <Text numberOfLines={1} style={styles.name}>{m.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const SIDEBAR_WIDTH = 92;

const styles = StyleSheet.create({
    container: {
        width: SIDEBAR_WIDTH,
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRightWidth: 1,
        borderRightColor: '#d9e1f2',
    },
    list: { gap: 14 },
    item: { alignItems: 'center' },
    avatar: {
        width: 56, height: 56, borderRadius: 28,
        borderWidth: 2, borderColor: '#ffffff', backgroundColor: '#eee',
    },
    name: { marginTop: 6, fontSize: 11, color: '#334155', maxWidth: 72, textAlign: 'center' },
});
