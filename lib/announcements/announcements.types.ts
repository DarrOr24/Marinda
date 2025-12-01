// lib/announcements/announcements.types.ts

export type AnnouncementKind =
    | 'sentence'   // sentence of the week
    | 'good'       // something good
    | 'kind'       // something kind I did
    | 'reminder'   // reminders (tests, shows, competitions, signatures)
    | 'free';      // free-flow sticky board

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

    week_start: string | null;       // 'YYYY-MM-DD'
    completed: boolean;

    created_at: string;
    updated_at: string;

    // Optional helper fields (frontend only)
    created_by_name?: string;
};

export const ANNOUNCEMENT_TABS = [
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
] as const

export type AnnouncementTabId =
    | 'reminder'
    | 'sentence'
    | 'good'
    | 'kind'
    | 'free'

export type AnnouncementTab = {
    id: AnnouncementTabId;
    label: string;
    emptyText: string;
    placeholder: string;
}
