// app/wishlist-info.tsx
import { Screen } from '@/components/ui/screen'
import React from 'react'
import {
    StyleSheet,
    Text,
    View
} from 'react-native'

export default function WishlistInfoScreen() {
    return (
        <Screen gap="md" withBackground={false}>
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
                <Bullet>
                    Some wishes may be fulfilled directly by the child, encouraging independence and trust.
                </Bullet>
                <Bullet>
                    Parents control this by setting a maximum price for self-fulfilled wishes in Wishlist Settings.
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
        </Screen>
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
