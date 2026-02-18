// app/boards/announcements-info.tsx
import { DocsBullet, DocsPageLayout, DocsSection, docsPageStyles } from '@/components/docs-page-layout';
import React from 'react';
import { Text } from 'react-native';

export default function AnnouncementsInfoScreen() {
    return (
        <DocsPageLayout intro="The Announcements Board is a shared family space where everyone can post updates, reminders, good things, kind actions, and weekly notes.">
            <DocsSection title="1. What Each Tab Means">
                <DocsBullet>
                    <Text style={docsPageStyles.highlight}>Reminders:</Text> Tests, shows,
                    competitions, appointments, signatures — anything the family needs
                    to remember.
                </DocsBullet>
                <DocsBullet>
                    <Text style={docsPageStyles.highlight}>Sentence of the Week:</Text> A
                    positive quote, affirmation, or message for the week.
                </DocsBullet>
                <DocsBullet>
                    <Text style={docsPageStyles.highlight}>Something Good:</Text> A moment that
                    went well, something you're proud of, or something you enjoyed.
                </DocsBullet>
                <DocsBullet>
                    <Text style={docsPageStyles.highlight}>Something Kind:</Text> A kind action
                    you did for someone else.
                </DocsBullet>
                <DocsBullet>
                    <Text style={docsPageStyles.highlight}>Notes:</Text> A free-flow sticky
                    board for anything — ideas, thoughts, doodles, or random messages.
                </DocsBullet>
            </DocsSection>

            <DocsSection title="2. Creating Announcements">
                <DocsBullet>Anyone in the family can post or share something.</DocsBullet>
                <DocsBullet>
                    Posts show the name of the family member who wrote them.
                </DocsBullet>
                <DocsBullet>
                    Each post automatically records the date and time it was created.
                </DocsBullet>
            </DocsSection>

            <DocsSection title="3. Editing & Deleting">
                <DocsBullet>
                    Only the person who created a post can edit or delete it.
                </DocsBullet>
                <DocsBullet>
                    Parents can also edit or delete any post in case something needs to
                    be corrected.
                </DocsBullet>
                <DocsBullet>
                    Deleting gives a confirmation so no one removes something by mistake.
                </DocsBullet>
            </DocsSection>

            <DocsSection title="4. Weekly Sentence Logic">
                <DocsBullet>
                    The Sentence of the Week is tied to a weekly cycle (Monday–Sunday).
                </DocsBullet>
                <DocsBullet>
                    Families can choose to replace it anytime or keep the same sentence
                    for several weeks.
                </DocsBullet>
            </DocsSection>

            <DocsSection title="5. Examples">
                <DocsBullet>"Rock climbing competition in 3 weeks."</DocsBullet>
                <DocsBullet>"I helped my sister clean the table."</DocsBullet>
                <DocsBullet>"My math test is on Thursday — reminder!"</DocsBullet>
                <DocsBullet>"Something good: I finished my book today!"</DocsBullet>
                <DocsBullet>"Sentence of the week: I can do hard things."</DocsBullet>
            </DocsSection>

            <DocsSection title="6. Custom Tabs & Settings">
                <DocsBullet>
                    Parents can create <Text style={docsPageStyles.highlight}>custom tabs</Text> to organize the board in a way that fits your family — such as "Holidays," "Signatures," "Chores," or anything else.
                </DocsBullet>
                <DocsBullet>
                    Custom tabs can be <Text style={docsPageStyles.highlight}>added, renamed, or deleted</Text> at any time from the Announcement Settings page.
                </DocsBullet>
                <DocsBullet>
                    Kids and teens can view and post inside custom tabs, but only parents can modify the tabs themselves.
                </DocsBullet>
            </DocsSection>
        </DocsPageLayout>
    );
}
