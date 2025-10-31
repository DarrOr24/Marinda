// app/profile/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import CheckerboardBackground from '@/components/CheckerboardBackground';
import Sidebar from '@/components/Sidebar';
import { members } from '@/data/members';

export default function MemberProfile() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const member = members.find(m => m.id === id);

    return (
        <View style={styles.screen}>
            <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

            {/* Left sidebar (stays visible here too) */}
            <Sidebar members={members} />

            {/* Center content */}
            <View style={styles.center}>
                <Text style={styles.title}>
                    {member ? `${member.name}'s Profile` : 'Profile'}
                </Text>
                <Text style={styles.subtitle}>Activities feed</Text>

                <View style={styles.card}>
                    <Text style={styles.cardText}>
                        Coming soon: chores, grocery, announcements & wish-list activity for this member.
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#E6F4FE',
    },
    center: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 24,
        gap: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 14,
        color: '#475569',
    },
    card: {
        borderRadius: 16,
        backgroundColor: 'white',
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    cardText: { color: '#334155' },
});
