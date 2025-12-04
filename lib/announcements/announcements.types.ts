// lib/announcements/announcements.types.ts

export type AnnouncementKind = string;

export type AnnouncementCategory =
    | 'competitions'
    | 'shows'
    | 'tests'
    | 'sign'
    | 'general'
    | null;

export type AnnouncementItem = {
    id: string;
    family_id: string;
    created_by_member_id: string;

    kind: AnnouncementKind;
    category: AnnouncementCategory;

    text: string;

    week_start: string | null;
    completed: boolean;

    created_at: string;
    updated_at: string;

    // frontend helper
    created_by_name?: string;
};

// -------------------------------
// DEFAULT tabs (built into code)
// -------------------------------

export const DEFAULT_ANNOUNCEMENT_TABS = [
    {
        id: 'reminder',
        label: 'Reminders',
        emptyText: 'No reminders yet. Add one below.',
        placeholder: 'Add a new reminder (tests, shows, appointments...)',
    },
    {
        id: 'sentence',
        label: 'Sentence',
        emptyText: 'No sentence yet. Add the sentence of the week.',
        placeholder: 'Write the sentence of the week...',
    },
    {
        id: 'good',
        label: 'Something good',
        emptyText: 'No “good things” yet. Add something that went well.',
        placeholder: 'Something good that happened...',
    },
    {
        id: 'kind',
        label: 'Something kind',
        emptyText: 'No kindness notes yet. Add something kind you did.',
        placeholder: 'Something kind I did...',
    },
    {
        id: 'free',
        label: 'Notes',
        emptyText: 'No notes yet. Add one below.',
        placeholder: 'Write a new note...',
    },
    {
        id: 'requests',
        label: 'Requests',
        emptyText: 'No requests yet.',
        placeholder: 'Write a new request...',
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
};
