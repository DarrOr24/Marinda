// app/wishlist-info.tsx
import { DocsBullet, DocsPageLayout, DocsSection, docsPageStyles } from '@/components/docs-page-layout';
import React from 'react';
import { Text } from 'react-native';

export default function WishlistInfoScreen() {
    return (
        <DocsPageLayout intro="The Wishlist helps kids set goals, learn to save points, and make thoughtful choices about how they use what they earn.">
            <DocsSection title="1. What the Wishlist Is">
                <DocsBullet>
                    Kids can add things they would like to get or do — items, experiences,
                    or personal goals.
                </DocsBullet>
                <DocsBullet>
                    Each wish can include a price, notes, links, and an optional image.
                </DocsBullet>
                <DocsBullet>
                    Wishes belong to a specific child and are visible to parents.
                </DocsBullet>
            </DocsSection>

            <DocsSection title="2. Points & Value">
                <DocsBullet>
                    Each family chooses how many points equal one unit of currency
                    (for example: <Text style={docsPageStyles.highlight}>10 points = $1</Text>).
                </DocsBullet>
                <DocsBullet>
                    The conversion rate and currency are set by parents in Wishlist Settings.
                </DocsBullet>
                <DocsBullet>
                    Kids can see how many points a wish costs before saving or fulfilling it.
                </DocsBullet>
            </DocsSection>

            <DocsSection title="3. Adding Wishes">
                <DocsBullet>
                    Kids can add wishes themselves from their own account.
                </DocsBullet>
                <DocsBullet>
                    Parents can view, edit, or remove wishes if needed.
                </DocsBullet>
                <DocsBullet>
                    Wishes can be updated over time as priorities change.
                </DocsBullet>
            </DocsSection>

            <DocsSection title="4. Fulfilling Wishes">
                <DocsBullet>
                    When a wish is fulfilled, it is marked as{' '}
                    <Text style={docsPageStyles.highlight}>Fulfilled</Text>.
                </DocsBullet>
                <DocsBullet>
                    The required points are deducted from the child's profile.
                </DocsBullet>
                <DocsBullet>
                    Fulfilled wishes stay visible for reference and learning.
                </DocsBullet>
                <DocsBullet>
                    Some wishes may be fulfilled directly by the child, encouraging independence and trust.
                </DocsBullet>
                <DocsBullet>
                    Parents control this by setting a maximum price for self-fulfilled wishes in Wishlist Settings.
                </DocsBullet>
            </DocsSection>

            <DocsSection title="5. Learning & Responsibility">
                <DocsBullet>
                    The wishlist encourages planning, patience, and goal-setting.
                </DocsBullet>
                <DocsBullet>
                    Kids learn to compare effort, time, and value before spending points.
                </DocsBullet>
                <DocsBullet>
                    Families can decide together what kinds of wishes are allowed.
                </DocsBullet>
            </DocsSection>
        </DocsPageLayout>
    );
}
