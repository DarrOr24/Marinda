// app/chores-info.tsx
import { Screen } from '@/components/ui';
import React from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';


export default function ChoresInfoScreen() {

    return (
        <Screen gap="md" withBackground={false}>
            <Text style={styles.intro}>
                The Chores Game helps kids get engaged with home life, stay motivated
                to help out, and track their points and rewards in one place.
            </Text>

            {/* 1. Creating chores */}
            <Section title="1. Creating Chores">
                <Bullet>Parents and kids can post chores at any time.</Bullet>
                <Bullet>
                    A chore can include a title, description, finish-by time, audio
                    instructions, and optional assignment to specific members.
                </Bullet>
                <Bullet>
                    Younger kids can use the game from a parent’s phone if they don’t
                    have their own device.
                </Bullet>
            </Section>

            {/* 2. Completing chores */}
            <Section title="2. Completing Chores">
                <Bullet>Kids can open an open chore and mark it as done.</Bullet>
                <Bullet>
                    They can add notes and upload a photo or video as proof.
                </Bullet>
                <Bullet>
                    If a chore is assigned to several members, any of them can complete
                    it (or you can decide your own house rules).
                </Bullet>
            </Section>

            {/* 3. Approval & points */}
            <Section title="3. Approval & Points">
                <Bullet>Parents review pending chores and approve or decline.</Bullet>
                <Bullet>
                    When approved, points are added to the child’s profile and saved in
                    their activity history.
                </Bullet>
                <Bullet>
                    If several kids did the same chore, points can be split between
                    them.
                </Bullet>
            </Section>

            {/* 4. Expired chores */}
            <Section title="4. Expired Chores">
                <Bullet>
                    Some chores have a finish-by time (for example, “Empty the
                    dishwasher by 7:30 pm”).
                </Bullet>
                <Bullet>
                    If the time passes and the chore isn’t done, it becomes{' '}
                    <Text style={styles.highlight}>Expired</Text>.
                </Bullet>
                <Bullet>Expired chores cannot be opened or completed anymore.</Bullet>
                <Bullet>
                    At the end of the day, expired chores move into{' '}
                    <Text style={styles.highlight}>History</Text>, so you can still see
                    how many expired chores there were that day or month.
                </Bullet>
            </Section>

            {/* 5. Rewards system */}
            <Section title="5. Rewards & Wishlist">
                <Bullet>
                    Each family decides what points mean: allowance, screen time, family
                    outings, or anything else.
                </Bullet>
                <Bullet>
                    Kids can save up points and use them to “buy” items from the family
                    Wishlist (coming together with the rest of the app).
                </Bullet>
                <Bullet>
                    You can change your reward system at any time — the game just helps
                    you track the points.
                </Bullet>
            </Section>

            {/* 6. Bonus points */}
            <Section title="6. Bonus Points (Planned)">
                <Bullet>
                    Parents will be able to set automatic rules, like:{' '}
                    “Every 100 points earned this week = +10 bonus points”.
                </Bullet>
                <Bullet>
                    Extra ideas: bonus points for no expired chores in a week, or for a
                    perfect streak of helping.
                </Bullet>
                <Bullet>
                    Parents will also be able to give manual bonus points directly from
                    a child’s profile.
                </Bullet>
            </Section>

            {/* 7. Profiles */}
            <Section title="7. Profiles & Activity">
                <Bullet>
                    Each family member has a profile that shows their points, approved
                    chores, bonuses, and history.
                </Bullet>
                <Bullet>
                    This gives kids a clear view of their effort and progress.
                </Bullet>
            </Section>

            <View style={{ height: 32 }} />
        </Screen>
    );
}

// Small helper components for cleaner markup
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

function Bullet({ children }: { children: React.ReactNode }) {
    return (
        <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>{'\u2022'}</Text>
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        padding: 4,
    },
    title: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
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
});
