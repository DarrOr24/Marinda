// app/boards/announcements-info.tsx
import { DocsBullet, DocsPageLayout, DocsSection, docsPageStyles } from '@/components/docs-page-layout';
import React from 'react';
import { Text } from 'react-native';

export default function AnnouncementsInfoScreen() {
    return (
        <DocsPageLayout intro="The Announcements Board is a shared family space where everyone can post notes, requests, and reminders.">
            <DocsSection title="1. What Each Tab Means">
                <DocsBullet>
                    <Text style={docsPageStyles.highlight}>Notes:</Text> A free-flow sticky
                    board for anything — ideas, thoughts, doodles, or random messages.
                </DocsBullet>
                <DocsBullet>
                    <Text style={docsPageStyles.highlight}>Requests:</Text> Things you need or
                    would like — from the family or for yourself.
                </DocsBullet>
                <DocsBullet>
                    <Text style={docsPageStyles.highlight}>Reminders:</Text> Tests, shows,
                    competitions, appointments, signatures — anything the family needs
                    to remember.
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

            <DocsSection title="4. Examples">
                <DocsBullet>"Rock climbing competition in 3 weeks." (Reminder)</DocsBullet>
                <DocsBullet>"I helped my sister clean the table." (Note)</DocsBullet>
                <DocsBullet>"My math test is on Thursday — reminder!" (Reminder)</DocsBullet>
                <DocsBullet>"Can we get more milk?" (Request)</DocsBullet>
                <DocsBullet>"Something good: I finished my book today!" (Note)</DocsBullet>
            </DocsSection>

            <DocsSection title="5. Custom Tabs & Settings">
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
