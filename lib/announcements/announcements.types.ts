// lib/announcements/announcements.types.ts

export type AnnouncementKind = string;


export type AnnouncementItem = {
    id: string;
    family_id: string;
    created_by_member_id: string;

    kind: AnnouncementKind;

    text: string;

    week_start: string | null;
    completed: boolean;

    created_at: string;
    updated_at: string;

    // frontend helper
    created_by_name?: string;
};

export type AnnouncementReply = {
    id: string;
    announcement_item_id: string;
    family_id: string;
    member_id: string;
    text: string;
    created_at: string;
    updated_at: string;
    /** Filled in UI */
    member_name?: string;
};

export type AnnouncementReaction = {
    id: string;
    announcement_item_id: string;
    family_id: string;
    member_id: string;
    emoji: string;
    created_at: string;
};

export type AnnouncementEngagementBundle = {
    replies: AnnouncementReply[];
    reactions: AnnouncementReaction[];
};

// -------------------------------
// DEFAULT tabs (built into code)
// -------------------------------

export const DEFAULT_ANNOUNCEMENT_TABS = [
    {
        id: 'notes',
        label: 'Notes',
        emptyText: 'No notes yet.',
        placeholder: 'Write a note...',
    },
    {
        id: 'requests',
        label: 'Requests',
        emptyText: 'No requests yet.',
        placeholder: 'Write a new request...',
    },
    {
        id: 'reminders',
        label: 'Reminders',
        emptyText: 'No reminders yet.',
        placeholder: 'Add a reminder (tests, shows, appointments...)',
    },
] as const;


export type AnnouncementTabId = string;

// -------------------------------
// NEW: DB-backed custom tab type
// -------------------------------
export type AnnouncementTab = {
    id: string;           // DB id OR default id
    label: string;
    placeholder: string;
    emptyText: string;
    sort_order?: number;
};
