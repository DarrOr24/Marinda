// app/chores-info.tsx
import { DocsBullet, DocsPageLayout, DocsSection, docsPageStyles } from '@/components/docs-page-layout';
import React from 'react';
import { Text } from 'react-native';

export default function ChoresInfoScreen() {
    return (
        <DocsPageLayout intro="The Chores Game helps kids get engaged with home life, stay motivated to help out, and track their points and rewards in one place.">
            <DocsSection title="1. Creating Chores">
                <DocsBullet>Parents and kids can post chores at any time.</DocsBullet>
                <DocsBullet>
                    A chore can include a title, description, finish-by time, audio
                    instructions, and optional assignment to specific members.
                </DocsBullet>
                <DocsBullet>
                    Younger kids can use the game from a parent’s phone if they don’t
                    have their own device.
                </DocsBullet>
            </DocsSection>

            {/* 2. Completing chores */}
            <DocsSection title="2. Completing Chores">
                <DocsBullet>Kids can open an open chore and mark it as done.</DocsBullet>
                <DocsBullet>
                    They can add notes and upload a photo or video as proof.
                </DocsBullet>
                <DocsBullet>
                    If a chore is assigned to several members, any of them can complete
                    it (or you can decide your own house rules).
                </DocsBullet>
            </DocsSection>

            {/* 3. Approval & points */}
            <DocsSection title="3. Approval & Points">
                <DocsBullet>Parents review pending chores and approve or decline.</DocsBullet>
                <DocsBullet>
                    When approved, points are added to the child’s profile and saved in
                    their activity history.
                </DocsBullet>
                <DocsBullet>
                    If several kids did the same chore, points can be split between
                    them.
                </DocsBullet>
            </DocsSection>

            {/* 4. Expired chores */}
            <DocsSection title="4. Expired Chores">
                <DocsBullet>
                    Some chores have a finish-by time (for example, “Empty the
                    dishwasher by 7:30 pm”).
                </DocsBullet>
                <DocsBullet>
                    If the time passes and the chore isn’t done, it becomes{' '}
                    <Text style={docsPageStyles.highlight}>Expired</Text>.
                </DocsBullet>
                <DocsBullet>Expired chores cannot be opened or completed anymore.</DocsBullet>
                <DocsBullet>
                    At the end of the day, expired chores move into{' '}
                    <Text style={docsPageStyles.highlight}>History</Text>, so you can still see
                    how many expired chores there were that day or month.
                </DocsBullet>
            </DocsSection>

            {/* 5. Rewards system */}
            <DocsSection title="5. Rewards & Wishlist">
                <DocsBullet>
                    Each family decides what points mean: allowance, screen time, family
                    outings, or anything else.
                </DocsBullet>
                <DocsBullet>
                    Kids can save up points and use them to “buy” items from the family
                    Wishlist (coming together with the rest of the app).
                </DocsBullet>
                <DocsBullet>
                    You can change your reward system at any time — the game just helps
                    you track the points.
                </DocsBullet>
            </DocsSection>

            {/* 6. Bonus points */}
            <DocsSection title="6. Bonus Points (Planned)">
                <DocsBullet>
                    Parents will be able to set automatic rules, like:{' '}
                    “Every 100 points earned this week = +10 bonus points”.
                </DocsBullet>
                <DocsBullet>
                    Extra ideas: bonus points for no expired chores in a week, or for a
                    perfect streak of helping.
                </DocsBullet>
                <DocsBullet>
                    Parents will also be able to give manual bonus points directly from
                    a child’s profile.
                </DocsBullet>
            </DocsSection>

            {/* 7. Profiles */}
            <DocsSection title="7. Profiles & Activity">
                <DocsBullet>
                    Each family member has a profile that shows their points, approved
                    chores, bonuses, and history.
                </DocsBullet>
                <DocsBullet>
                    This gives kids a clear view of their effort and progress.
                </DocsBullet>
            </DocsSection>

        </DocsPageLayout>
    );
}
