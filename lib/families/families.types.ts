// lib/families/families.types.ts
import { type Role } from "@/lib/members/members.types";

export interface MyFamily {
  id: string;
  name: string;
  avatar_url: string | null;
  role: Role;
}

export type Membership = {
  familyId: string;
  familyName: string;
  familyCode: string;
};

export type FamilyInviteStatus = "pending" | "accepted" | "revoked" | "expired" | "rejected";

export interface FamilyInvite {
  id: string;
  family_id: string;
  invited_phone: string;
  role: Role;
  status: FamilyInviteStatus;
  token?: string;
  expires_at: string | null;
  invited_by_profile_id: string | null;
}
