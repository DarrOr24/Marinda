export type ChoreStatus = "open" | "pending" | "approved";

export type Proof = {
    uri: string;
    kind: "image" | "video";
    type: "BEFORE" | "AFTER";
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

    status: ChoreStatus;

    // optional audio
    audioDescriptionUrl?: string | null;
    audioDescriptionDuration?: number | null; // seconds

    // optional deadline
    expiresAt?: number; // ms since epoch

    // ✅ DONE BY 
    doneByIds: string[];
    doneAt?: number;

    // ✅ APPROVAL
    approvedById?: string;
    approvedAt?: number;

    // extra / meta
    notes?: string;
    proofs?: Proof[];
    proofNote?: string;

    // ✅ ASSIGNEES 
    assignedToIds: string[];
    assignedToNames?: string[];

    // creator
    createdByMemberId?: string;
    createdByName?: string;
};

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
