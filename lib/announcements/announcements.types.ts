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
