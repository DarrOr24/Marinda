import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';

type DocsPageLayoutProps = {
    /** Optional intro paragraph shown at the top */
    intro?: string;
    /** Optional title (header) - shown larger and bold when used with subtext */
    title?: string;
    /** Optional subtext below title */
    subtext?: string;
    children: React.ReactNode;
};

/**
 * Layout for documentation-style pages (info and settings).
 * Provides consistent Screen wrapper, intro styling, and section/bullet components.
 */
export function DocsPageLayout({ intro, title, subtext, children }: DocsPageLayoutProps) {
    return (
        <Screen gap="sm" withBackground={false}>
            {title ? <Text style={docsPageStyles.header}>{title}</Text> : null}
            {subtext ? <Text style={docsPageStyles.subtext}>{subtext}</Text> : null}
            {intro ? <Text style={docsPageStyles.intro}>{intro}</Text> : null}
            {children}
            <View style={docsPageStyles.bottomSpacer} />
        </Screen>
    );
}

type DocsSectionProps = {
    title: string;
    children: React.ReactNode;
};

export function DocsSection({ title, children }: DocsSectionProps) {
    return (
        <View style={docsPageStyles.section}>
            <Text style={docsPageStyles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

type DocsBulletProps = {
    children: React.ReactNode;
};

export function DocsBullet({ children }: DocsBulletProps) {
    return (
        <View style={docsPageStyles.bulletRow}>
            <Text style={docsPageStyles.bulletDot}>{'\u2022'}</Text>
            <Text style={docsPageStyles.bulletText}>{children}</Text>
        </View>
    );
}

export const docsPageStyles = StyleSheet.create({
    header: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
    },
    subtext: {
        marginTop: 4,
        fontSize: 13,
        color: '#475569',
        marginBottom: 10,
    },
    intro: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 10,
    },
    section: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 4,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 2,
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
    note: {
        fontSize: 12,
        color: '#64748b',
    },
    description: {
        fontSize: 13,
        color: '#475569',
        marginBottom: 8,
    },
    bottomSpacer: {
        height: 32,
    },
});
