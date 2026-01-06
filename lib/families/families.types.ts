// lib/families/families.types.ts
import { type Role } from "@/lib/members/members.types"

export interface MyFamily {
  id: string
  name: string
  avatar_url: string | null
  role: Role
}

export type Membership = {
  familyId: string
  familyName: string
  familyCode: string
}
