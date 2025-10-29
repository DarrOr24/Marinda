// components/Sidebar.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MemberAvatar, { Member } from './MemberAvatar';

const SIDEBAR_WIDTH = 92;
const AVATAR_SIZE = 48;
const AVATAR_BORDER = 3;

export default function Sidebar({ members }: { members: Member[] }) {
    const router = useRouter();
    const pathname = usePathname();

    const isHomeActive = pathname === '/' || pathname === '/index';
    const activeMemberId = pathname.match(/^\/profile\/(.+)$/)?.[1];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {/* Home */}
                <TouchableOpacity
                    onPress={() => router.push('/')}
                    style={styles.item}
                    accessibilityRole="button"
                    accessibilityLabel="Go to Home"
                >
                    <View style={[styles.avatarBox, isHomeActive && styles.avatarBoxActive]}>
                        <MaterialCommunityIcons name="home-variant-outline" size={28} color="#334155" />
                    </View>
                    <Text numberOfLines={1} style={styles.name}>Home</Text>
                </TouchableOpacity>

                {/* Members */}
                {members.map((m, idx) => {
                    const isActive = activeMemberId === m.id;
                    return (
                        <TouchableOpacity
                            key={m.id}
                            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: m.id } })}
                            style={styles.item}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${m.name}'s profile`}
                        >
                            <View style={[styles.avatarBox, isActive && styles.avatarBoxActive]}>
                                <View style={styles.memberAvatarInner}>
                                    <MemberAvatar member={m} index={idx} />
                                </View>
                            </View>
                            <Text numberOfLines={1} style={styles.name}>{m.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

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
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    item: {
        width: SIDEBAR_WIDTH,
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 6,
        borderRadius: 16,
    },

    avatarBox: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 3,             // fixed border width to keep size constant
        borderColor: 'transparent', // becomes blue when active
    },
    avatarBoxActive: {
        borderColor: '#2563eb',
    },

    memberAvatarInner: {
        width: AVATAR_SIZE - AVATAR_BORDER * 2 - 4,
        height: AVATAR_SIZE - AVATAR_BORDER * 2 - 4,
        borderRadius: (AVATAR_SIZE - AVATAR_BORDER * 2 - 4) / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },

    name: {
        marginTop: 6,
        fontSize: 11,
        color: '#334155',
        maxWidth: 72,
        textAlign: 'center',
        fontWeight: '500',
    },
});
