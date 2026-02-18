// app/chores.tsx
import ChoreDetailModal from '@/components/modals/chore-detail-modal';

import { useChoreTemplates } from '@/lib/chores/chores-templates.hooks';
import type { ChoreView, Proof } from '@/lib/chores/chores.types';
import { useRouter } from 'expo-router';

import ChorePostModal from '@/components/modals/chore-post-modal';
import { useAuthContext } from '@/hooks/use-auth-context';
import {
  logChorePointsEvent,
  updateChore,
  uploadChoreAudioDescription
} from '@/lib/chores/chores.api';
import { awardMemberPoints } from '@/lib/families/families.api';
import { useFamily } from '@/lib/families/families.hooks';
import type { Role } from '@/lib/members/members.types';

import { Button, ScreenList } from "@/components/ui";

import {
  useAddChore,
  useApproveChore,
  useDeleteChore,
  useDuplicateChore,
  useFamilyChores,
  useRejectChore,
  useSubmitChore,
  useUpdateChore,
} from '@/lib/chores/chores.hooks';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';




type DbStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
const dbToUiStatus = (s: DbStatus): ChoreView['status'] =>
  s === 'OPEN'
    ? 'open'
    : s === 'SUBMITTED'
      ? 'pending'
      : s === 'APPROVED'
        ? 'approved'
        : 'open';

const shortId = (id?: string) => (id ? `ID ${String(id).slice(0, 8)}` : '—');

const formatDateTime = (ts?: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();

  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) {
    return `Today • ${time}`;
  }

  const date = d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  return `${date} • ${time}`;
};

type TabKey = 'open' | 'pending' | 'approved' | 'archived';

export default function Chores() {
  const { activeFamilyId, member, family, members } = useAuthContext() as any;
  const router = useRouter();

  const authUserId: string | undefined =
    member?.profile?.id || member?.user_id || member?.profile_id;
  const currentRole = (member?.role as Role) ?? 'TEEN';

  // hydrate family + members via React Query
  const { familyMembers } = useFamily(activeFamilyId || undefined);

  const { data: choresRows } = useFamilyChores(activeFamilyId)

  const addChoreMutation = useAddChore(activeFamilyId)
  const updateChoreMutation = useUpdateChore(activeFamilyId)
  const deleteChoreMutation = useDeleteChore(activeFamilyId)
  const duplicateChoreMutation = useDuplicateChore(activeFamilyId)
  const submitChoreMutation = useSubmitChore(activeFamilyId)
  const approveChoreMutation = useApproveChore(activeFamilyId)
  const rejectChoreMutation = useRejectChore(activeFamilyId)


  // Unified raw members list
  const rawMembers: any[] = useMemo(
    () =>
      (familyMembers?.data ?? members?.data ?? members ?? family?.members ?? []) as any[],
    [familyMembers?.data, members, family]
  );

  // Build a stable resolver: family_member_id -> display name
  const nameForId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of rawMembers) {
      const id = m?.id ?? m?.member_id;
      if (!id) continue;
      const name =
        m?.nickname ||
        m?.profile?.first_name ||
        m?.first_name ||
        m?.profile?.name ||
        m?.name ||
        '';
      map[id] = name || shortId(id);
    }
    return (id?: string) => (id ? map[id] || shortId(id) : '—');
  }, [rawMembers]);

  // Options for “Done by” / “Assign to” selector
  const doneByOptions = useMemo(
    () =>
      rawMembers
        .map((m) => {
          const id = m?.id ?? m?.member_id;
          if (!id) return null;
          const name =
            m?.nickname ||
            m?.profile?.first_name ||
            m?.first_name ||
            m?.profile?.name ||
            m?.name ||
            '';
          return { id, name: name || shortId(id) };
        })
        .filter(Boolean) as { id: string; name: string }[],
    [rawMembers]
  );

  // Current signed-in family_member_id (for default selection + some mutations)
  const myFamilyMemberId: string | undefined = useMemo(() => {
    if (member?.id) return member.id as string;
    const me = rawMembers.find(
      (m: any) =>
        m?.user_id === authUserId ||
        m?.profile?.id === authUserId ||
        m?.profile_id === authUserId
    );
    return me?.id as string | undefined;
  }, [member, rawMembers, authUserId]);

  const { templates, createTemplate, deleteTemplate } = useChoreTemplates(activeFamilyId);

  const isParent = useMemo(
    () => currentRole === 'MOM' || currentRole === 'DAD',
    [currentRole]
  );

  const [list, setList] = useState<ChoreView[]>([]);
  const [showPost, setShowPost] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ChoreView | null>(null);
  const selected = selectedId ? list.find((c) => c.id === selectedId) ?? null : null;

  // which tab is visible
  const [tab, setTab] = useState<TabKey>('open');

  // "today" midnight for archiving
  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // Load chores (via hook)
  useEffect(() => {
    if (!choresRows) return;

    try {
      const mapped: ChoreView[] = (choresRows ?? []).map((r: any) => {
        const doneFromDb = r.done_at
          ? new Date(r.done_at).getTime()
          : undefined;

        const doneAt =
          doneFromDb ??
          (r.status === "OPEN" && r.created_at
            ? new Date(r.created_at).getTime()
            : undefined);

        const expiresAt = r.expires_at
          ? new Date(r.expires_at).getTime()
          : undefined;

        // Created by
        let createdByMemberId: string | undefined;
        let createdByName: string | undefined;

        if (r.created_by) {
          const creator = rawMembers.find(
            (m: any) =>
              m?.user_id === r.created_by ||
              m?.profile?.id === r.created_by ||
              m?.profile_id === r.created_by
          );
          if (creator) {
            createdByMemberId = creator.id ?? creator.member_id;
            if (createdByMemberId) {
              createdByName = nameForId(createdByMemberId);
            }
          }
        }

        // Assigned members
        const assignedIds: string[] =
          (r.assignee_member_ids as string[] | null) ?? [];

        const assignedNames =
          assignedIds && assignedIds.length
            ? assignedIds.map((id: string) => nameForId(id))
            : undefined;

        // proofs from fetchChores()
        const proofs: Proof[] = Array.isArray(r.proofs)
          ? r.proofs.map((p: any) => ({
            uri: p.uri,
            kind: p.kind,
            type: p.type,
          }))
          : [];

        return {
          id: r.id,
          title: r.title,
          description: r.description ?? undefined,
          points: r.points ?? 0,
          status: dbToUiStatus(r.status as DbStatus),

          assignedToIds: assignedIds ?? [],
          assignedToNames: assignedNames,

          doneByIds: (r.done_by_member_ids as string[] | null) ?? [],
          doneAt,


          approvedById: r.approved_by_member_id ?? undefined,
          approvedAt: r.approved_at
            ? new Date(r.approved_at).getTime()
            : undefined,

          notes: r.notes ?? undefined,
          proofs,

          audioDescriptionUrl: r.audio_description_url ?? undefined,
          audioDescriptionDuration: r.audio_description_duration ?? undefined,

          createdByName,
          createdByMemberId,

          proofNote: r.proof_note ?? undefined,
          expiresAt,
        };
      });

      setList(mapped);
    } catch (e) {
      console.error("map chores failed", e);
      Alert.alert("Error", "Could not load chores.");
    }
  }, [choresRows, nameForId, rawMembers]);


  // ---- derived lists for each tab ----
  const grouped = useMemo(() => {
    const open: ChoreView[] = [];
    const pending: ChoreView[] = [];
    const approved: ChoreView[] = [];
    const archived: ChoreView[] = [];

    const now = Date.now();

    for (const c of list) {
      const isExpiredToday =
        c.status === 'open' &&
        c.expiresAt &&
        c.expiresAt < now &&
        c.expiresAt >= startOfToday;

      const expiredBeforeToday =
        c.status === 'open' &&
        c.expiresAt &&
        c.expiresAt < startOfToday;

      if (c.status === 'open') {
        if (expiredBeforeToday) {
          // expired on a previous day -> History
          archived.push(c);
        } else {
          // still belongs in "To do" (including expired-today ones)
          open.push(c);
        }
      } else if (c.status === 'pending') {
        pending.push(c);
      } else if (c.status === 'approved') {
        const ts = c.approvedAt ?? c.doneAt ?? 0;
        if (ts >= startOfToday) {
          approved.push(c); // approved today
        } else {
          archived.push(c); // older approvals
        }
      }
    }

    const sortByRecent = (arr: ChoreView[]) =>
      [...arr].sort(
        (a, b) => (b.doneAt ?? b.approvedAt ?? 0) - (a.doneAt ?? a.approvedAt ?? 0)
      );

    return {
      open: sortByRecent(open),
      pending: sortByRecent(pending),
      approved: sortByRecent(approved),
      archived: sortByRecent(archived),
    } as Record<TabKey, ChoreView[]>;
  }, [list, startOfToday]);

  const dataForTab = grouped[tab];

  // Post a chore (any member)
  const postChore = async ({
    title,
    description,
    points,
    saveAsTemplate,
    assignedToIds,
    audioLocal,
    expiresAt,
  }: {
    title: string;
    description?: string;
    points: number;
    saveAsTemplate?: boolean;
    assignedToIds?: string[];
    audioLocal?: { uri: string; durationSeconds: number };
    expiresAt?: string | null;
  }) => {
    if (!activeFamilyId) return;

    try {
      // 1) upload audio (optional)
      let audioUrl: string | null = null;
      let audioDuration: number | null = null;

      if (audioLocal) {
        const { publicUrl } = await uploadChoreAudioDescription(
          activeFamilyId,
          myFamilyMemberId ?? null,
          {
            uri: audioLocal.uri,
            durationSeconds: audioLocal.durationSeconds,
          }
        );
        audioUrl = publicUrl;
        audioDuration = audioLocal.durationSeconds;
      }

      const normalizedAssignedIds =
        assignedToIds && assignedToIds.length > 0 ? assignedToIds : [];

      // 2) create chore (PLURAL ONLY)
      const row = await addChoreMutation.mutateAsync({
        familyId: activeFamilyId,
        chore: {
          title,
          description,
          points,
          assigned_to_ids: normalizedAssignedIds,
          audioDescriptionUrl: audioUrl,
          audioDescriptionDuration: audioDuration,
          expiresAt: expiresAt ?? null,
        },
      });

      const assignedIds: string[] =
        (row as any).assignee_member_ids ?? normalizedAssignedIds;

      const assignedNames =
        assignedIds.length > 0
          ? assignedIds.map((memberId) => nameForId(memberId))
          : undefined;

      const created: ChoreView = {
        id: row.id,
        title: row.title,
        description: row.description ?? description,
        points: row.points ?? points,
        status: dbToUiStatus(row.status as DbStatus),

        proofs: [],
        doneByIds: [],

        expiresAt: row.expires_at
          ? new Date(row.expires_at).getTime()
          : undefined,

        assignedToIds: assignedIds,
        assignedToNames: assignedNames,

        audioDescriptionUrl: row.audio_description_url ?? audioUrl ?? undefined,
        audioDescriptionDuration:
          row.audio_description_duration ?? audioDuration ?? undefined,

        createdByMemberId: myFamilyMemberId,
        createdByName: myFamilyMemberId ? nameForId(myFamilyMemberId) : 'You',
      };

      setList((prev) => [created, ...prev]);

      if (saveAsTemplate) {
        await createTemplate({
          title,
          defaultPoints: points,
          createdById: myFamilyMemberId,
        });
      }

      setShowPost(false);
    } catch (e) {
      console.error('addChore failed', e);
      Alert.alert('Error', 'Could not post the chore.');
    }
  };


  // Edit (creator or parent, open)
  const onEdit = async (
    id: string,
    updates: {
      title: string;
      description?: string;
      points: number;
      assignedToIds?: string[];
      expiresAt?: string | null;
    }
  ) => {
    try {
      const normalizedAssignedIds =
        updates.assignedToIds && updates.assignedToIds.length > 0
          ? updates.assignedToIds
          : [];

      const row = await updateChoreMutation.mutateAsync({
        choreId: id,
        fields: {
          title: updates.title,
          description: updates.description ?? null,
          points: updates.points,
          assigned_to_ids: normalizedAssignedIds,
          expiresAt: updates.expiresAt ?? null,
        },
      });

      const assignedIds: string[] =
        (row as any).assignee_member_ids ??
        normalizedAssignedIds;

      const assignedNames =
        assignedIds.length > 0
          ? assignedIds.map((memberId) => nameForId(memberId))
          : undefined;

      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
              ...c,
              title: row.title,
              description: row.description ?? updates.description,
              points: row.points ?? updates.points,
              assignedToIds: assignedIds,
              assignedToNames: assignedNames,
              expiresAt: row.expires_at
                ? new Date(row.expires_at).getTime()
                : undefined,
            }
            : c
        )
      );

      setEditing(null);
    } catch (e) {
      console.error('updateChore failed', e);
      Alert.alert('Error', 'Could not save changes.');
    }
  };


  // Local proofs
  const onAttachProof = (id: string, proof: Proof | null) => {
    setList((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;

        const existing = c.proofs ?? [];

        // Clear all proofs
        if (proof === null) {
          return { ...c, proofs: [] };
        }

        // ✅ Treat empty uri as "remove this proof type"
        if (!proof.uri) {
          return {
            ...c,
            proofs: existing.filter((p) => p.type !== proof.type),
          };
        }

        // Replace the existing proof of the same type ("BEFORE" or "AFTER")
        const filtered = existing.filter((p) => p.type !== proof.type);

        return {
          ...c,
          proofs: [...filtered, proof],
        };
      })
    );
  };

  const isLocalUri = (uri?: string) =>
    !!uri && (uri.startsWith('file://') || uri.startsWith('content://'));

  // Kid submits (SUBMITTED) – multi-member submit
  const onMarkPending = async (
    id: string,
    doneByIds: string[],
    proofNote?: string
  ) => {
    try {
      if (!doneByIds || doneByIds.length === 0)
        throw new Error("Missing selected family members");

      const theChore = list.find((c) => c.id === id);
      if (!theChore) throw new Error("Chore not found");

      // Extract BEFORE and AFTER proofs from local UI state
      const before = theChore.proofs?.find((p) => p.type === "BEFORE") || null;
      const after = theChore.proofs?.find((p) => p.type === "AFTER") || null;

      if (!after?.uri) {
        Alert.alert("Proof required", "Please attach an AFTER photo or video.");
        return;
      }

      // ✅ Critical: block remote URLs from previous submissions
      if (!isLocalUri(after.uri)) {
        Alert.alert(
          "New proof required",
          "This chore already has an old proof from a previous submission. Please upload a NEW AFTER photo/video before submitting again."
        );
        return;
      }


      // Build the correct payload
      const proofsPayload = { before, after };

      // SEND to backend 
      const row = await submitChoreMutation.mutateAsync({
        choreId: id,
        memberIds: doneByIds,
        proofs: proofsPayload,
        proofNote,
      });

      const when = row.done_at
        ? new Date(row.done_at).getTime()
        : Date.now();

      // After submitChore, proofs live ONLY in chore_proofs table → keep local version
      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
              ...c,
              status: "pending",
              doneByIds,
              doneAt: when,
              proofs: theChore.proofs ?? [],
              proofNote: proofNote ?? undefined,
            }
            : c
        )
      );
    } catch (e) {
      console.error("submitChore failed", e);
      Alert.alert("Error", "Could not mark as completed.");
    }
  };


  // Parent approves (APPROVED) + split points evenly between all members who did it
  const onApprove = async (
    id: string,
    notes?: string,
    updatedPoints?: number
  ) => {
    try {
      if (!myFamilyMemberId) {
        throw new Error('Missing family member id');
      }

      // 1️⃣ If parent edited points, persist first
      if (typeof updatedPoints === 'number' && !Number.isNaN(updatedPoints)) {
        await updateChore(id, { points: updatedPoints });
      }

      // 2️⃣ Approve chore
      const row = await approveChoreMutation.mutateAsync({
        choreId: id,
        parentMemberId: myFamilyMemberId,
        notes,
      });

      const approverId =
        row.approved_by_member_id ?? myFamilyMemberId;

      const approvedAt =
        row.approved_at
          ? new Date(row.approved_at).getTime()
          : Date.now();

      const local = list.find((c) => c.id === id);

      const totalPoints =
        (row.points as number | undefined) ??
        (local?.points ?? 0);

      // ✅ PLURAL ONLY — backend is source of truth
      const doneByIds: string[] =
        (row.done_by_member_ids as string[] | null | undefined) ??
        local?.doneByIds ??
        [];

      // 3️⃣ Update local UI state
      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
              ...c,
              status: 'approved',
              notes: row.notes ?? notes,
              approvedById: approverId,
              approvedAt,
              doneByIds, // 🔒 keep invariant
            }
            : c
        )
      );

      // 4️⃣ Split & award points
      if (doneByIds.length > 0 && totalPoints > 0) {
        const perMember = Math.ceil(totalPoints / doneByIds.length);
        const familyIdForLedger = activeFamilyId;

        await Promise.all(
          doneByIds.map(async (memberId) => {
            if (familyIdForLedger) {
              const reason = local?.title
                ? `Completed chore: ${local.title}`
                : 'Chore approved';

              await logChorePointsEvent({
                familyId: familyIdForLedger,
                memberId,
                choreId: id,
                delta: perMember,
                approverMemberId: approverId,
                reason,
              });
            }

            await awardMemberPoints(memberId, perMember);
          })
        );
      }
    } catch (e) {
      console.error('approveChore failed', e);
      Alert.alert('Error', 'Could not approve the chore.');
    }
  };


  // Parent declines -> OPEN
  const onDecline = async (id: string, notes?: string) => {
    try {
      const row = await rejectChoreMutation.mutateAsync({
        choreId: id,
        notes,
      });
      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
              ...c,
              status: 'open',
              notes: row.notes ?? notes,
              doneByIds: [],
              doneAt: undefined,
              approvedById: undefined,
              approvedAt: undefined,
              proofs: [],
            }
            : c
        )
      );
    } catch (e) {
      console.error('rejectChore failed', e);
      Alert.alert('Error', 'Could not decline the chore.');
    }
  };

  // Delete (creator or parent, open) with confirm
  const onDelete = (id: string) => {
    Alert.alert('Delete Chore', 'Are you sure you want to delete this chore?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChoreMutation.mutateAsync(id);
            setList((prev) => prev.filter((c) => c.id !== id));
            setSelectedId(null);
          } catch (e) {
            console.error('deleteChore failed', e);
            Alert.alert('Error', 'Could not delete the chore.');
          }
        },
      },
    ]);
  };

  // Duplicate (anyone, open) with confirm
  const onDuplicate = (id: string) => {
    Alert.alert(
      'Duplicate Chore',
      'Do you want to create a duplicate of this chore?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            try {
              const row = await duplicateChoreMutation.mutateAsync(id);

              // --- ASSIGNEES (PLURAL ONLY) ---
              const assignedToIds: string[] =
                (row as any).assignee_member_ids ?? [];

              const assignedToNames =
                assignedToIds.length > 0
                  ? assignedToIds.map((memberId: string) => nameForId(memberId))
                  : [];

              const created: ChoreView = {
                id: row.id,
                title: row.title,
                description: row.description ?? undefined,
                points: row.points ?? 0,
                status: dbToUiStatus(row.status as DbStatus),

                // ✅ REQUIRED ARRAYS
                proofs: [],
                assignedToIds,
                assignedToNames,
                doneByIds: [],

                expiresAt: row.expires_at
                  ? new Date(row.expires_at).getTime()
                  : undefined,

                audioDescriptionUrl:
                  row.audio_description_url ?? undefined,
                audioDescriptionDuration:
                  row.audio_description_duration ?? undefined,

                createdByMemberId: myFamilyMemberId,
                createdByName: myFamilyMemberId
                  ? nameForId(myFamilyMemberId)
                  : 'You',
              };

              setList((prev) => [created, ...prev]);
            } catch (e) {
              console.error('duplicateChore failed', e);
              Alert.alert('Error', 'Could not duplicate the chore.');
            }
          },
        },
      ]
    );
  };

  function handleOpen(item: ChoreView) {
    const now = Date.now();
    const isExpired =
      item.status === 'open' && item.expiresAt && item.expiresAt < now;

    if (isExpired) {
      Alert.alert('Expired', 'This chore has expired and can’t be completed.');
      return;
    }

    if (item.status === 'pending' && !isParent) {
      Alert.alert('Pending approval', 'Only a parent can review this chore.');
      return;
    }
    setSelectedId(item.id);
  }

  const humanTabLabel: Record<TabKey, string> = {
    open: 'To do',
    pending: 'Needs check',
    approved: 'Approved ⭐',
    archived: 'History',
  };

  return (
    <ScreenList style={styles.screen} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>

        {/* LEFT: Post Chore */}
        <Button
          title="Post Chore"
          type="primary"
          size="md"
          showShadow
          onPress={() => setShowPost(true)}
          leftIcon={<Ionicons name="add" size={18} />}
          style={{ borderRadius: 12 }} // optional if you want the same shape
        />


        {/* RIGHT: info + settings */}
        <View style={styles.headerRight}>
          <Button
            type="outline"
            size="sm"
            backgroundColor="#eef2ff"
            round
            hitSlop={8}
            onPress={() => router.push('/chores-info')}
            leftIcon={<Ionicons name="information-circle-outline" size={18} />}
          />

          <Button
            type="outline"
            size="sm"
            backgroundColor="#eef2ff"
            round
            hitSlop={8}
            onPress={() => router.push('/chores-settings')}
            leftIcon={<Ionicons name="settings-outline" size={18} />}
          />
        </View>


      </View>



      {/* tabs */}
      <View style={styles.tabsRow}>
        {(['open', 'pending', 'approved', 'archived'] as TabKey[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text
              style={[styles.tabLabel, tab === key && styles.tabLabelActive]}
              numberOfLines={2}
            >
              {humanTabLabel[key]}
            </Text>

            {key !== 'archived' && grouped[key].length > 0 && (
              <View
                style={[
                  styles.countBubble,
                  tab === key && styles.countBubbleActive,
                ]}
              >
                <Text style={styles.countText}>{grouped[key].length}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <FlatList
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 16, paddingTop: 16, paddingBottom: 32, gap: 12 }}
        data={dataForTab}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No {humanTabLabel[tab].toLowerCase()} yet
            </Text>
            {tab === 'open' && (
              <Text style={styles.emptySubtitle}>
                Use the button above to post a new chore.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isCreator =
            !!myFamilyMemberId &&
            item.createdByMemberId &&
            item.createdByMemberId === myFamilyMemberId;
          const canModify = isParent || isCreator;
          const now = Date.now();
          const isExpired =
            item.status === 'open' && item.expiresAt && item.expiresAt < now;


          const assignedLabel =
            item.assignedToNames && item.assignedToNames.length > 0
              ? item.assignedToNames.join(', ')
              : null;





          return (
            <Pressable onPress={() => handleOpen(item)} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.points > 0
                    ? `${item.points} pts • ${isExpired
                      ? 'Expired'
                      : item.status === 'open'
                        ? 'To do'
                        : item.status === 'pending'
                          ? 'Needs check'
                          : 'Approved ⭐'
                    }`
                    : isExpired
                      ? 'Expired'
                      : item.status === 'open'
                        ? 'To do'
                        : item.status === 'pending'
                          ? 'Needs check'
                          : 'Approved ⭐'}
                </Text>


                {assignedLabel && (
                  <Text style={styles.assignedText}>Assigned to: {assignedLabel}</Text>
                )}

                {item.createdByName && (
                  <Text style={styles.assignedText}>
                    Created by: {item.createdByName}
                  </Text>
                )}

                {/* DONE BY (for pending or approved) */}
                {(item.status === 'pending' || item.status === 'approved') &&
                  item.doneByIds &&
                  item.doneByIds.length > 0 && (
                    <Text style={styles.assignedText}>
                      Done by: {item.doneByIds.map(id => nameForId(id)).join(', ')}
                    </Text>
                  )}


                {item.status === 'open' && item.expiresAt && (
                  <Text style={styles.dueText}>
                    {isExpired
                      ? `Expired at: ${formatDateTime(item.expiresAt)}`
                      : `Finish by: ${formatDateTime(item.expiresAt)}`}
                  </Text>
                )}


                {item.status === 'open' && item.doneAt && (
                  <Text style={styles.timeText}>{formatDateTime(item.doneAt)}</Text>
                )}

                {item.status === 'pending' && item.doneAt && (
                  <Text style={styles.timeText}>{formatDateTime(item.doneAt)}</Text>
                )}
              </View>

              {/* right side */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {item.points > 0 && (
                  <View style={styles.badge}>
                    <MaterialCommunityIcons
                      name="star-circle-outline"
                      size={18}
                      color="#1e3a8a"
                    />
                    <Text style={styles.badgeTxt}>{item.points}</Text>
                  </View>
                )}

                {item.status === 'open' && (
                  <View style={styles.actions}>
                    {/* Duplicate – everyone */}
                    <Button
                      type="outline"
                      size="sm"
                      round
                      hitSlop={8}
                      backgroundColor="#eef2ff"
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        onDuplicate(item.id);
                      }}

                      leftIcon={<Feather name="copy" size={16} />}
                    />


                    {/* Edit + Delete – only creator or parent */}
                    {canModify && (
                      <>
                        <Button
                          type="outline"
                          size="sm"
                          round
                          hitSlop={8}
                          backgroundColor="#eef2ff"
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            setEditing(item);
                          }}

                          leftIcon={<Feather name="edit-3" size={16} />}
                        />

                        <Button
                          type="outline"
                          size="sm"
                          round
                          hitSlop={8}
                          backgroundColor="#fee2e2"
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            onDelete(item.id);
                          }}

                          leftIcon={<Feather name="trash-2" size={16} />}
                        />

                      </>
                    )}
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />

      {/* create */}
      <ChorePostModal
        visible={showPost}
        onClose={() => setShowPost(false)}
        onSubmit={postChore}
        templates={templates}
        assigneeOptions={doneByOptions}
        canEditPoints={isParent}
      />

      {/* edit */}
      {editing && (
        <ChorePostModal
          visible={!!editing}
          onClose={() => setEditing(null)}
          onSubmit={(vals) => onEdit(editing.id, vals)}
          initial={{
            title: editing.title,
            description: editing.description ?? '',
            points: editing.points,

            // ✅ PLURAL ONLY
            assignedToIds: editing.assignedToIds ?? [],

            expiresAt: editing.expiresAt ?? null,
          }}
          titleText="Edit Chore"
          submitText="Save"
          assigneeOptions={doneByOptions}
          canEditPoints={isParent}
        />
      )}

      {/* details modal */}
      {selected && (
        <ChoreDetailModal
          visible={!!selected}
          chore={selected}
          currentRole={currentRole}
          onClose={() => setSelectedId(null)}
          onAttachProof={onAttachProof}
          onMarkPending={onMarkPending}
          onApprove={onApprove}
          onDecline={onDecline}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          nameForId={nameForId}
          doneByOptions={doneByOptions}
          defaultDoneById={myFamilyMemberId}
        />
      )}
    </ScreenList>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FBFF' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between', // icons left, button right
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
    paddingTop: 16,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  tabsRow: {
    flexDirection: 'row',
    paddingLeft: 20,
    paddingRight: 16,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#2563eb15',
    borderColor: '#2563eb',
  },
  tabLabel: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tabLabelActive: {
    color: '#1d4ed8',
  },
  tabCount: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  assignedText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  dueText: {
    fontSize: 11,
    color: '#f97316', // or reuse another soft color if you prefer
    marginTop: 2,
  },

  actions: { flexDirection: 'row', gap: 8, marginRight: 2 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeTxt: { color: '#1e3a8a', fontWeight: '800' },

  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  countBubble: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#d1d5db',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  countBubbleActive: {
    backgroundColor: '#2563eb',
  },
  countText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
});
