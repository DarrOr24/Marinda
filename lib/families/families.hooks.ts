// lib/families/families.hooks.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/use-auth-context";
import { useToast } from "@/hooks/use-toast-context";
import {
  cancelFamilyInvite,
  createKidMember,
  fetchFamily,
  fetchFamilyInvites,
  fetchFamilyMembers,
  fetchMyFamilies,
  getFamilyAvatarPublicUrl,
  removeFamilyMember,
  rotateFamilyCode,
  rpcCreateFamily,
  rpcJoinFamily,
  updateFamilyAvatar,
  updateMemberRole,
} from "@/lib/families/families.api";
import type { CreateKidMemberParams } from "@/lib/families/families.api";
import type { FamilyInvite, MyFamily } from "@/lib/families/families.types";
import type { FamilyMember, Role } from "@/lib/members/members.types";
import { usePostgresChangesInvalidate } from "@/lib/realtime";


export function useCreateFamily() {
  const qc = useQueryClient();
  const { setActiveFamilyId, refreshMemberships } = useAuthContext();

  return useMutation({
    mutationFn: (
      { name, nickname }: { name: string; nickname?: string | null },
    ) => rpcCreateFamily(name, nickname ?? null),

    onMutate: async ({ name }) => {
      await qc.cancelQueries({ queryKey: ["families"] });
      const previous = qc.getQueryData(["families"]);
      qc.setQueryData(
        ["families"],
        (old: any) => [...(old ?? []), { id: "temp", name }],
      );
      return { previous };
    },

    onSuccess: async (familyId: string) => {
      await setActiveFamilyId(familyId);
      await refreshMemberships();
      qc.invalidateQueries({ queryKey: ["families"] });
      qc.invalidateQueries({ queryKey: ["family", familyId] });
      qc.invalidateQueries({ queryKey: ["family-members", familyId] });
      qc.invalidateQueries({ queryKey: ["family-invites", familyId] });
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["families"], ctx.previous);
    },
  });
}

export function useJoinFamily(defaultRole: Role = "TEEN") {
  const qc = useQueryClient();
  const { setActiveFamilyId, refreshMemberships } = useAuthContext();

  return useMutation({
    mutationFn: ({
      code,
      role,
      nickname,
    }: {
      code: string;
      role?: Role;
      nickname?: string | null;
    }) => rpcJoinFamily(code, role ?? defaultRole, nickname ?? null),

    onSuccess: async (familyId: string) => {
      await setActiveFamilyId(familyId);
      await refreshMemberships();
      qc.invalidateQueries({ queryKey: ["families"] });
      qc.invalidateQueries({ queryKey: ["family", familyId] });
      qc.invalidateQueries({ queryKey: ["family-members", familyId] });
      qc.invalidateQueries({ queryKey: ["family-invites", familyId] });
      qc.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

export function useFamily(familyId?: string | null) {
  const metaRt = useMemo(() => {
    if (!familyId) return null;
    return {
      table: "families",
      filter: `id=eq.${familyId}`,
      queryKeys: [["family", familyId]],
      channel: `rt:family:${familyId}:meta`,
    } as const;
  }, [familyId]);

  const membersRt = useMemo(() => {
    if (!familyId) return null;
    return {
      table: "family_members",
      filter: `family_id=eq.${familyId}`,
      queryKeys: [["family-members", familyId]],
      channel: `rt:family:${familyId}:members`,
    } as const;
  }, [familyId]);

  const invitesRt = useMemo(() => {
    if (!familyId) return null;
    return {
      table: "family_invites",
      filter: `family_id=eq.${familyId}`,
      queryKeys: [
        ["family-invites", familyId],
        ["family-members", familyId],
      ],
      channel: `rt:family:${familyId}:invites`,
    } as const;
  }, [familyId]);

  usePostgresChangesInvalidate(metaRt);
  usePostgresChangesInvalidate(membersRt);
  usePostgresChangesInvalidate(invitesRt);

  const family = useQuery({
    queryKey: ["family", familyId],
    queryFn: async () => {
      const f = await fetchFamily(familyId!);
      return {
        ...f,
        public_avatar_url: f.avatar_url
          ? getFamilyAvatarPublicUrl(f.avatar_url)
          : null,
      };
    },
    enabled: !!familyId,
  });

  const familyMembers = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => fetchFamilyMembers(familyId!),
    enabled: !!familyId,
  });

  const familyInvites = useQuery<FamilyInvite[]>({
    queryKey: ["family-invites", familyId],
    queryFn: () => fetchFamilyInvites(familyId!),
    enabled: !!familyId,
  });

  return { family, familyMembers, familyInvites };
}

export function useUpdateMemberRole(familyId: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      updateMemberRole(memberId, role),

    onMutate: async (variables) => {
      const { memberId, role } = variables;
      await qc.cancelQueries({ queryKey: ["family-members", familyId] });

      const previousMembers =
        qc.getQueryData<FamilyMember[]>(["family-members", familyId]) ?? [];

      qc.setQueryData<FamilyMember[]>(["family-members", familyId], (old) => {
        if (!old) return old;
        return old.map((m) => (m.id === memberId ? { ...m, role } : m));
      });

      return { previousMembers };
    },

    onSuccess: () => {
      // ensure eventual consistency (and picks up server-side changes)
      qc.invalidateQueries({ queryKey: ["family-members", familyId] });
    },

    onError: (error: any, _vars, context) => {
      if (context?.previousMembers) {
        qc.setQueryData<FamilyMember[]>(
          ["family-members", familyId],
          context.previousMembers,
        );
      }

      const message =
        error?.message ?? "Could not update role. Please try again.";
      showToast(message, "error");
    },
  });
}

export function useUpdateFamilyAvatar(familyId: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (fileUri: string) => updateFamilyAvatar(familyId, fileUri),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family", familyId] }),
    onError: (error: any) => {
      showToast(
        error?.message ?? "Could not update family photo. Please try again.",
        "error",
      );
    },
  });
}

export function useRotateFamilyCode(familyId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => rotateFamilyCode(familyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family", familyId] }),
  });
}

export function useRemoveMember(familyId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId }: { memberId: string }) =>
      removeFamilyMember(familyId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-members", familyId] });
      // if removals can affect permissions/visibility, invites view may change too
      qc.invalidateQueries({ queryKey: ["family-invites", familyId] });
    },
  });
}

export function useCancelFamilyInvite(familyId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ inviteId }: { inviteId: string }) =>
      cancelFamilyInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-invites", familyId] });
      // optional: if your accept flow updates members via invite state, keep both consistent
      qc.invalidateQueries({ queryKey: ["family-members", familyId] });
    },
  });
}

export function useCreateKidMember(familyId: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (params: CreateKidMemberParams) =>
      createKidMember(familyId, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-members", familyId] });
      showToast("Kid added to the family.", "success");
    },
    onError: (error: any) => {
      showToast(
        error?.message ?? "Could not add kid. Please try again.",
        "error",
      );
    },
  });
}

export function useMyFamilies(profileId?: string) {
  return useQuery<MyFamily[]>({
    queryKey: ["my-families", profileId],
    queryFn: async () => {
      const families = await fetchMyFamilies(profileId!);
      return families.map((f) => ({
        ...f,
        public_avatar_url: f.avatar_url
          ? getFamilyAvatarPublicUrl(f.avatar_url)
          : null,
      }));
    },
    enabled: !!profileId,
  });
}
