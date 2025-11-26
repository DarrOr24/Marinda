// app/settings.tsx
import CheckerboardBackground from '@/components/checkerboard-background'
import MemberSidebar from '@/components/members-sidebar'
import { useAuthContext } from '@/hooks/use-auth-context'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SettingsScreen() {
    const { member } = useAuthContext() as any

    if (!member) {
        return (
            <View style={[styles.screen, styles.centerOnly]}>
                <Text style={styles.subtitle}>Loading…</Text>
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
            <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

            {/* Left sidebar */}
            <MemberSidebar />

            {/* Center content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.center}
                keyboardShouldPersistTaps="handled"
            >

                {/* Form fields will go here */}
                <View style={styles.card}>
                    <Text style={styles.cardText}>Profile editing coming next…</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#E6F4FE',
    },
    centerOnly: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 24,
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
    cardText: {
        color: '#334155',
    },
})
