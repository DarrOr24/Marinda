// lib/chores/chores.types.ts

export type ChoreStatus = "open" | "pending" | "approved";

export type Proof = {
    uri: string;
    kind: "image" | "video";
};

export type ChoreView = {
    id: string;
    title: string;
    points: number;
    status: ChoreStatus;

    // who did the chore
    doneById?: string;
    doneByName?: string;
    doneAt?: number;

    // who approved + when
    approvedById?: string;
    approvedByName?: string;
    approvedAt?: number;   // 👈 ADD THIS LINE

    // extra
    notes?: string;
    proofs?: Proof[];
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
