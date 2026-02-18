import { Screen } from "@/components/ui";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AnnouncementsInfoScreen() {
    return (
        <Screen gap="md" withBackground={false}>

            <Text style={styles.intro}>
                The Announcements Board is a shared family space where everyone can
                post updates, reminders, good things, kind actions, and weekly notes.
            </Text>

            {/* 1. What each tab means */}
            <Section title="1. What Each Tab Means">
                <Bullet>
                    <Text style={styles.highlight}>Reminders:</Text> Tests, shows,
                    competitions, appointments, signatures — anything the family needs
                    to remember.
                </Bullet>
                <Bullet>
                    <Text style={styles.highlight}>Sentence of the Week:</Text> A
                    positive quote, affirmation, or message for the week.
                </Bullet>
                <Bullet>
                    <Text style={styles.highlight}>Something Good:</Text> A moment that
                    went well, something you’re proud of, or something you enjoyed.
                </Bullet>
                <Bullet>
                    <Text style={styles.highlight}>Something Kind:</Text> A kind action
                    you did for someone else.
                </Bullet>
                <Bullet>
                    <Text style={styles.highlight}>Notes:</Text> A free-flow sticky
                    board for anything — ideas, thoughts, doodles, or random messages.
                </Bullet>
            </Section>

            {/* 2. Creating announcements */}
            <Section title="2. Creating Announcements">
                <Bullet>Anyone in the family can post or share something.</Bullet>
                <Bullet>
                    Posts show the name of the family member who wrote them.
                </Bullet>
                <Bullet>
                    Each post automatically records the date and time it was created.
                </Bullet>
            </Section>

            {/* 3. Editing & deleting */}
            <Section title="3. Editing & Deleting">
                <Bullet>
                    Only the person who created a post can edit or delete it.
                </Bullet>
                <Bullet>
                    Parents can also edit or delete any post in case something needs to
                    be corrected.
                </Bullet>
                <Bullet>
                    Deleting gives a confirmation so no one removes something by mistake.
                </Bullet>
            </Section>

            {/* 4. Weekly sentence logic */}
            <Section title="4. Weekly Sentence Logic">
                <Bullet>
                    The Sentence of the Week is tied to a weekly cycle (Monday–Sunday).
                </Bullet>
                <Bullet>
                    Families can choose to replace it anytime or keep the same sentence
                    for several weeks.
                </Bullet>
            </Section>

            {/* 5. Examples */}
            <Section title="5. Examples">
                <Bullet>“Rock climbing competition in 3 weeks.”</Bullet>
                <Bullet>“I helped my sister clean the table.”</Bullet>
                <Bullet>“My math test is on Thursday — reminder!”</Bullet>
                <Bullet>“Something good: I finished my book today!”</Bullet>
                <Bullet>“Sentence of the week: I can do hard things.”</Bullet>
            </Section>

            {/* 6. Custom Tabs & Settings */}
            <Section title="6. Custom Tabs & Settings">
                <Bullet>
                    Parents can create <Text style={styles.highlight}>custom tabs</Text> to organize the board in a way that fits your family — such as “Holidays,” “Signatures,” “Chores,” or anything else.
                </Bullet>
                <Bullet>
                    Custom tabs can be <Text style={styles.highlight}>added, renamed, or deleted</Text> at any time from the Announcement Settings page.
                </Bullet>
                <Bullet>
                    Kids and teens can view and post inside custom tabs, but only parents can modify the tabs themselves.
                </Bullet>
            </Section>

            <View style={{ height: 32 }} />
        </Screen>

    );
}

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
    intro: { fontSize: 14, color: "#475569", marginBottom: 16 },
    section: { marginTop: 12 },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 6,
    },
    bulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 4,
    },
    bulletDot: {
        fontSize: 14,
        color: "#64748b",
        marginRight: 6,
        marginTop: 2,
    },
    bulletText: {
        flex: 1,
        fontSize: 13,
        color: "#4b5563",
    },
    highlight: {
        fontWeight: "700",
        color: "#1d4ed8",
    },
});
