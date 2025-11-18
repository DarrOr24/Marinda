// app/chores-settings.tsx
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthContext } from '@/hooks/use-auth-context';
import type { Role } from '@/lib/families/families.types';

export default function ChoresSettingsScreen() {
    const { member } = useAuthContext() as any;

    const currentRole: Role = useMemo(
        () => (member?.role as Role) ?? 'TEEN',
        [member]
    );

    const isParent = currentRole === 'MOM' || currentRole === 'DAD';

    if (!isParent) {
        // Just in case someone non-parent gets here somehow
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.center}>
                    <Text style={styles.lockTitle}>Parents only</Text>
                    <Text style={styles.lockText}>
                        Chores settings can only be managed by parents.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.intro}>
                    Set up your family&apos;s routine chores and points rules. These settings
                    help keep the game fair, motivating, and clear for everyone.
                </Text>

                {/* Section: Routine chores */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Routine chores</Text>
                    <Text style={styles.sectionText}>
                        Here you&apos;ll be able to add, edit, and delete routine chores like
                        &quot;Empty dishwasher&quot; or &quot;Tidy toys&quot; with default point
                        values.
                    </Text>
                    <Text style={styles.sectionText}>
                        Later, the Post Chore screen can reuse these as quick templates so you
                        don&apos;t have to type the same chores again and again.
                    </Text>
                </View>

                {/* Section: Points rules */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Points rules & bonuses</Text>
                    <Text style={styles.sectionText}>
                        Soon you&apos;ll be able to set automatic rules, like:
                    </Text>
                    <Text style={styles.bullet}>
                        • Every 100 points earned in a week = +10 bonus points
                    </Text>
                    <Text style={styles.bullet}>
                        • 0 expired chores this week = bonus points for everyone
                    </Text>
                    <Text style={styles.sectionText}>
                        You&apos;ll also be able to give manual bonus points from each child&apos;s
                        profile page.
                    </Text>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F7FBFF',
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
    intro: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 16,
    },
    section: {
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 6,
    },
    sectionText: {
        fontSize: 13,
        color: '#4b5563',
        marginBottom: 4,
    },
    bullet: {
        fontSize: 13,
        color: '#4b5563',
        marginLeft: 12,
        marginBottom: 2,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    lockTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 8,
    },
    lockText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
    },
});
