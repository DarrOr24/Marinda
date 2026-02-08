// lib/families/families.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/use-auth-context";
import { useToast } from "@/hooks/use-toast-context";
import {
  cancelFamilyInvite,
  fetchFamily,
  fetchFamilyInvites,
  fetchFamilyMembers,
  fetchMyFamilies,
  removeFamilyMember,
  rotateFamilyCode,
  rpcCreateFamily,
  rpcJoinFamily,
  updateFamilyAvatar,
  updateMemberRole,
} from "@/lib/families/families.api";
import { FamilyInvite, MyFamily } from "@/lib/families/families.types";
import { FamilyMember, Role } from "@/lib/members/members.types";

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
      qc.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

export function useFamily(familyId?: string) {
  const family = useQuery({
    queryKey: ["family", familyId],
    queryFn: () => fetchFamily(familyId!),
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

    // Optimistically update the family members list
    onMutate: async (variables) => {
      const { memberId, role } = variables;
      await qc.cancelQueries({ queryKey: ["family-members", familyId] });
      const previousMembers =
        qc.getQueryData<FamilyMember[]>(["family-members", familyId]) ?? [];
      qc.setQueryData<FamilyMember[]>(["family-members", familyId], (old) => {
        if (!old) return old;
        return old.map((m) => m.id === memberId ? { ...m, role } : m);
      });

      return { previousMembers };
    },

    onError: (error, _vars, context) => {
      if (context?.previousMembers) {
        qc.setQueryData<FamilyMember[]>(
          ["family-members", familyId],
          context.previousMembers,
        );
      }

      const message = error?.message ??
        "Could not update role. Please try again.";
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["family-members", familyId] }),
  });
}

export function useCancelFamilyInvite(familyId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ inviteId }: { inviteId: string }) =>
      cancelFamilyInvite(inviteId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["family-invites", familyId] }),
  });
}

export function useMyFamilies(profileId?: string) {
  return useQuery<MyFamily[]>({
    queryKey: ["my-families", profileId],
    queryFn: () => fetchMyFamilies(profileId!),
    enabled: !!profileId,
  });
}
