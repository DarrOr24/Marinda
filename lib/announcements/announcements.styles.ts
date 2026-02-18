// lib/announcements/announcements.styles.ts
// Bulletin board styling: sticky note colors and tab pill colors per tab kind.

export const BULLETIN_COLORS: Record<string, string> = {
    notes: '#fef9c3',      // yellow sticky
    requests: '#dbeafe',   // light blue
    reminders: '#fce7f3',  // light pink
};

export const BULLETIN_BORDER: Record<string, string> = {
    notes: '#facc15',
    requests: '#3b82f6',
    reminders: '#ec4899',
};

export const TAB_PILL_TEXT: Record<string, string> = {
    notes: '#92400e',
    requests: '#1e40af',
    reminders: '#9d174d',
};

export const CUSTOM_TAB_BG = '#f1f5f9';
export const CUSTOM_TAB_BORDER = '#94a3b8';
export const CUSTOM_TAB_TEXT = '#475569';

export function getBulletinStyle(kind: string) {
    return {
        backgroundColor: BULLETIN_COLORS[kind] ?? CUSTOM_TAB_BG,
        borderLeftColor: BULLETIN_BORDER[kind] ?? CUSTOM_TAB_BORDER,
    };
}
