// lib/chores/chores.types.ts

export type ChoreStatus = "open" | "pending" | "approved";

export type Proof = {
    uri: string;
    kind: "image" | "video";
    type: "BEFORE" | "AFTER";   // ⭐ NEW
};

export type ProofPayload = {
    before?: Proof | null;
    after?: Proof | null;
};

export type ChoreView = {
    id: string;
    title: string;
    points: number;
    description: string;
    audioDescriptionUrl?: string | null;
    audioDescriptionDuration?: number | null; // in seconds
    status: ChoreStatus;

    // deadline (optional)
    expiresAt?: number; // ms since epoch, from expires_at

    // who did the chore
    doneById?: string;
    doneByIds?: string[];
    doneByName?: string;
    doneAt?: number;

    // who approved + when
    approvedById?: string;
    approvedByName?: string;
    approvedAt?: number;

    // extra
    notes?: string;
    proofs?: Proof[];

    assignedToId?: string;
    assignedToName?: string;

    assignedToIds?: string[];
    assignedToNames?: string[];

    createdByName?: string;
    createdByMemberId?: string;

    proofNote?: string;
};

// (optional) for later, templates:
export type ChoreTemplate = {
    id: string;
    familyId: string;
    title: string;
    defaultPoints: number;
    createdById?: string | null;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
};
