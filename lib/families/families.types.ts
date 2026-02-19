// lib/families/families.types.ts
import { type Role } from "@/lib/members/members.types";

export type SubscriptionPlan = "basic" | "pro";

export type SubscriptionStatus = "active" | "canceled" | "expired";

export interface FamilySubscription {
  id: string;
  family_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  product_id: string | null;
  paying_profile_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  avatar_url: string | null;
  // Optional - from full family fetch (settings, details)
  code?: string;
  created_at?: string;
  created_by?: string | null;
  billing_owner_id?: string | null;
  // Optional - from my-families list (includes current user's role)
  role?: Role;
  // Client-only: injected into React Query cache
  public_avatar_url?: string | null;
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
