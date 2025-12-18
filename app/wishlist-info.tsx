// app/wishlist-info.tsx
import React from 'react'
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function WishlistInfoScreen() {
    return (
        <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.intro}>
                    The Wishlist helps kids set goals, learn to save points, and make thoughtful
                    choices about how they use what they earn.
                </Text>

                {/* 1. What the Wishlist is */}
                <Section title="1. What the Wishlist Is">
                    <Bullet>
                        Kids can add things they would like to get or do — items, experiences,
                        or personal goals.
                    </Bullet>
                    <Bullet>
                        Each wish can include a price, notes, links, and an optional image.
                    </Bullet>
                    <Bullet>
                        Wishes belong to a specific child and are visible to parents.
                    </Bullet>
                </Section>

                {/* 2. Points & value */}
                <Section title="2. Points & Value">
                    <Bullet>
                        Each family chooses how many points equal one unit of currency
                        (for example: <Text style={styles.highlight}>10 points = $1</Text>).
                    </Bullet>
                    <Bullet>
                        The conversion rate and currency are set by parents in Wishlist Settings.
                    </Bullet>
                    <Bullet>
                        Kids can see how many points a wish costs before saving or fulfilling it.
                    </Bullet>
                </Section>

                {/* 3. Adding wishes */}
                <Section title="3. Adding Wishes">
                    <Bullet>
                        Kids can add wishes themselves from their own account.
                    </Bullet>
                    <Bullet>
                        Parents can view, edit, or remove wishes if needed.
                    </Bullet>
                    <Bullet>
                        Wishes can be updated over time as priorities change.
                    </Bullet>
                </Section>

                {/* 4. Fulfilling wishes */}
                <Section title="4. Fulfilling Wishes">
                    <Bullet>
                        When a wish is fulfilled, it is marked as{' '}
                        <Text style={styles.highlight}>Fulfilled</Text>.
                    </Bullet>
                    <Bullet>
                        The required points are deducted from the child’s profile.
                    </Bullet>
                    <Bullet>
                        Fulfilled wishes stay visible for reference and learning.
                    </Bullet>
                </Section>

                {/* 5. Learning & responsibility */}
                <Section title="5. Learning & Responsibility">
                    <Bullet>
                        The wishlist encourages planning, patience, and goal-setting.
                    </Bullet>
                    <Bullet>
                        Kids learn to compare effort, time, and value before spending points.
                    </Bullet>
                    <Bullet>
                        Families can decide together what kinds of wishes are allowed.
                    </Bullet>
                </Section>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    )
}

/* ---------- helpers ---------- */

function Section({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    )
}

function Bullet({ children }: { children: React.ReactNode }) {
    return (
        <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>{'\u2022'}</Text>
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    )
}

/* ---------- styles ---------- */

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
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    bulletDot: {
        fontSize: 14,
        color: '#64748b',
        marginRight: 6,
        marginTop: 2,
    },
    bulletText: {
        flex: 1,
        fontSize: 13,
        color: '#4b5563',
    },
    highlight: {
        fontWeight: '700',
        color: '#1d4ed8',
    },
})
