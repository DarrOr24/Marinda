import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MemberAvatar, { Member } from './MemberAvatar';


export default function Sidebar({ members }: { members: Member[] }) {
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {members.map((m, idx) => (
                    <TouchableOpacity
                        key={m.id}
                        onPress={() => { /* open profile or select */ }}
                    >
                        <MemberAvatar member={m} index={idx} />
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
    item: { alignItems: 'center' },
    name: {
        marginTop: 6,
        fontSize: 11,
        color: '#334155',
        maxWidth: 72,
        textAlign: 'center',
    },
});
