// app/chores.tsx
import ChoreDetailModal from '@/components/chore-detail-modal';
import { useChoreTemplates } from '@/lib/chores/chores-templates.hooks';
import type { ChoreView, Proof } from '@/lib/chores/chores.types';

import ChorePostModal from '@/components/chore-post-modal';
import { useAuthContext } from '@/hooks/use-auth-context';
import {
  addChore as apiAddChore,
  deleteChore as apiDeleteChore,
  duplicateChore as apiDuplicateChore,
  approveChore,
  fetchChores,
  rejectChore,
  submitChore,
  updateChore,
} from '@/lib/chores/chores.api';
import { awardMemberPoints } from '@/lib/families/families.api';
import { useFamily } from '@/lib/families/families.hooks';
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime';
import type { Role } from '@/lib/families/families.types';

import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type DbStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
const dbToUiStatus = (s: DbStatus): ChoreView['status'] =>
  s === 'OPEN' ? 'open' : s === 'SUBMITTED' ? 'pending' : s === 'APPROVED' ? 'approved' : 'open';

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
  const currentRole = (member?.role as Role) ?? 'TEEN';

  // hydrate family + members via React Query
  const { members: membersQuery } = useFamily(activeFamilyId || undefined);
  useSubscribeTableByFamily('family_members', activeFamilyId || undefined, [
    'family-members',
    activeFamilyId,
  ]);

  // Unified raw members list
  const rawMembers: any[] = useMemo(
    () =>
      (membersQuery?.data ?? members?.data ?? members ?? family?.members ?? []) as any[],
    [membersQuery?.data, members, family]
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
    if (member?.id) return member.id as string; // already a family_member record
    const authUserId = member?.profile?.id || member?.user_id || member?.profile_id;
    const me = rawMembers.find(
      (m: any) =>
        m?.user_id === authUserId ||
        m?.profile?.id === authUserId ||
        m?.profile_id === authUserId
    );
    return me?.id as string | undefined;
  }, [member, rawMembers]);

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

  // Load chores
  useEffect(() => {
    if (!activeFamilyId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchChores(activeFamilyId);
        if (cancelled) return;
        const mapped: ChoreView[] = (rows ?? []).map((r: any) => {
          const doneFromDb = r.done_at ? new Date(r.done_at).getTime() : undefined;

          const doneAt =
            doneFromDb ??
            (r.status === 'OPEN' && r.created_at
              ? new Date(r.created_at).getTime()
              : undefined);

          return {
            id: r.id,
            title: r.title,
            points: r.points ?? 0,
            status: dbToUiStatus(r.status as DbStatus),

            // assignment from DB
            assignedToId: r.assignee_member_id ?? undefined,
            assignedToName: r.assignee_member_id
              ? nameForId(r.assignee_member_id)
              : undefined,

            doneById: r.done_by_member_id ?? undefined,
            doneByIds: r.done_by_member_ids ?? [],
            doneAt,
            approvedById: r.approved_by_member_id ?? undefined,
            approvedAt: r.approved_at ? new Date(r.approved_at).getTime() : undefined,
            notes: r.notes ?? undefined,
            proofs:
              r.proof_uri && r.proof_kind
                ? [{ uri: r.proof_uri, kind: r.proof_kind }]
                : [],
          };
        });

        setList(mapped);
      } catch (e) {
        console.error('fetchChores failed', e);
        Alert.alert('Error', 'Could not load chores.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFamilyId, nameForId]);

  // ---- derived lists for each tab ----
  const grouped = useMemo(() => {
    const open: ChoreView[] = [];
    const pending: ChoreView[] = [];
    const approved: ChoreView[] = [];
    const archived: ChoreView[] = [];

    for (const c of list) {
      if (c.status === 'open') {
        open.push(c);
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

    // sort a little: newest first per list
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

  // Post a chore (parent)
  const postChore = async ({
    title,
    points,
    saveAsTemplate,
    assignedToId,
  }: {
    title: string;
    points: number;
    saveAsTemplate?: boolean;
    assignedToId?: string;
  }) => {
    if (!activeFamilyId) return;
    try {
      // 1) create the actual chore
      const row = await apiAddChore(activeFamilyId, {
        title,
        points,
        assigned_to: assignedToId,
      });

      const created: ChoreView = {
        id: row.id,
        title: row.title,
        points: row.points ?? points,
        status: dbToUiStatus(row.status as DbStatus),
        proofs: [],
        assignedToId: row.assignee_member_id ?? assignedToId,
        assignedToName: row.assignee_member_id
          ? nameForId(row.assignee_member_id)
          : assignedToId
            ? nameForId(assignedToId)
            : undefined,
      };
      setList((prev) => [created, ...prev]);

      // 2) optionally also save as routine template
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

  // Edit (parent, open) – we do NOT edit assignment for now
  const onEdit = async (
    id: string,
    updates: { title: string; points: number; assignedToId?: string }
  ) => {
    try {
      const row = await updateChore(id, {
        title: updates.title,
        points: updates.points,
      });
      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, title: row.title, points: row.points ?? updates.points }
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
        if (proof === null) return { ...c, proofs: [] };
        return { ...c, proofs: [...(c.proofs ?? []), proof] };
      })
    );
  };

  // Kid submits (SUBMITTED) – multi-member submit
  const onMarkPending = async (id: string, doneByIds: string[]) => {
    try {
      if (!doneByIds || doneByIds.length === 0)
        throw new Error('Missing selected family members');

      const theChore = list.find((c) => c.id === id);
      const lastProof = theChore?.proofs?.[theChore.proofs.length - 1];

      // SEND ALL MEMBERS
      const row = await submitChore(id, doneByIds, lastProof as any);

      const when = row.done_at ? new Date(row.done_at).getTime() : Date.now();

      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
              ...c,
              status: 'pending',
              doneById: doneByIds[0], // keep for backwards UI
              doneByIds: doneByIds, // REAL ARRAY
              doneAt: when,
              proofs:
                row.proof_uri && row.proof_kind
                  ? [{ uri: row.proof_uri, kind: row.proof_kind }]
                  : [],
            }
            : c
        )
      );
    } catch (e) {
      console.error('submitChore failed', e);
      Alert.alert('Error', 'Could not mark as completed.');
    }
  };

  // Parent approves (APPROVED) + split points evenly between all members who did it
  const onApprove = async (id: string, notes?: string) => {
    try {
      if (!myFamilyMemberId) throw new Error('Missing family member id');

      // Approve in chores table (row includes done_by_member_ids)
      const row = await approveChore(id, myFamilyMemberId, notes);
      const approverId = row.approved_by_member_id ?? myFamilyMemberId;
      const when = row.approved_at ? new Date(row.approved_at).getTime() : Date.now();

      // Local chore for fallback data
      const local = list.find((c) => c.id === id);

      // Total points for this chore
      const totalPoints: number =
        (row.points as number | undefined) ?? (local?.points ?? 0);

      // All members who should get points
      const idsFromRow =
        (row.done_by_member_ids as string[] | null | undefined) ?? [];
      const idsFromLocal = (local?.doneByIds && local.doneByIds.length > 0
        ? local.doneByIds
        : local?.doneById
          ? [local.doneById]
          : []) as string[];

      const memberIds = (idsFromRow.length ? idsFromRow : idsFromLocal).filter(
        Boolean
      );

      // Update the chore locally
      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
              ...c,
              status: 'approved',
              notes: row.notes ?? notes,
              approvedById: approverId,
              approvedAt: when,
            }
            : c
        )
      );

      // Split points evenly, rounding UP per member
      if (memberIds.length > 0 && totalPoints > 0) {
        const perMember = Math.ceil(totalPoints / memberIds.length);

        await Promise.all(
          memberIds.map((memberId) => awardMemberPoints(memberId, perMember))
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
      const row = await rejectChore(id, notes);
      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
              ...c,
              status: 'open',
              notes: row.notes ?? notes,
              doneById: undefined,
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

  // Delete (parent, open) with confirm
  const onDelete = (id: string) => {
    Alert.alert('Delete Chore', 'Are you sure you want to delete this chore?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDeleteChore(id);
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

  // Duplicate (parent, open) with confirm
  const onDuplicate = (id: string) => {
    Alert.alert('Duplicate Chore', 'Do you want to create a duplicate of this chore?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          try {
            const row = await apiDuplicateChore(id);
            const created: ChoreView = {
              id: row.id,
              title: row.title,
              points: row.points ?? 0,
              status: dbToUiStatus(row.status as DbStatus),
              proofs: [],
              assignedToId: row.assignee_member_id ?? undefined,
              assignedToName: row.assignee_member_id
                ? nameForId(row.assignee_member_id)
                : undefined,
            };
            setList((prev) => [created, ...prev]);
          } catch (e) {
            console.error('duplicateChore failed', e);
            Alert.alert('Error', 'Could not duplicate the chore.');
          }
        },
      },
    ]);
  };

  function handleOpen(item: ChoreView) {
    if (item.status === 'pending' && !isParent) {
      Alert.alert('Pending approval', 'Only a parent can review this chore.');
      return;
    }
    setSelectedId(item.id);
  }

  // stop bubbling from the icon buttons into the card press
  const stop = (fn: () => void) => (e: GestureResponderEvent) => {
    // @ts-ignore RN supports stopPropagation
    e.stopPropagation?.();
    fn();
  };

  const humanTabLabel: Record<TabKey, string> = {
    open: 'To do',
    pending: 'Needs check',
    approved: 'Approved ⭐',
    archived: 'History',
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.h1}>Chores Game</Text>
        {isParent && (
          <Pressable onPress={() => setShowPost(true)} style={styles.postBtn}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.postTxt}>Post Chore</Text>
          </Pressable>
        )}
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
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        data={dataForTab}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No {humanTabLabel[tab].toLowerCase()} yet
            </Text>
            {tab === 'open' && (
              <Text style={styles.emptySubtitle}>
                Parents can post new chores using the button above.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handleOpen(item)} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.points} pts •{' '}
                {item.status === 'open'
                  ? 'To do'
                  : item.status === 'pending'
                    ? 'Needs check'
                    : 'Approved ⭐'}
              </Text>

              {item.assignedToName && (
                <Text style={styles.assignedText}>
                  Assigned to: {item.assignedToName}
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
              <View style={styles.badge}>
                <MaterialCommunityIcons
                  name="star-circle-outline"
                  size={18}
                  color="#1e3a8a"
                />
                <Text style={styles.badgeTxt}>{item.points}</Text>
              </View>

              {isParent && item.status === 'open' && (
                <View style={styles.actions}>
                  <Pressable
                    onPress={stop(() => onDuplicate(item.id))}
                    style={styles.iconBtn}
                    hitSlop={8}
                  >
                    <Feather name="copy" size={16} color="#1e3a8a" />
                  </Pressable>
                  <Pressable
                    onPress={stop(() => setEditing(item))}
                    style={styles.iconBtn}
                    hitSlop={8}
                  >
                    <Feather name="edit-3" size={16} color="#1e3a8a" />
                  </Pressable>
                  <Pressable
                    onPress={stop(() => onDelete(item.id))}
                    style={[styles.iconBtn, styles.deleteBtn]}
                    hitSlop={8}
                  >
                    <Feather name="trash-2" size={16} color="#b91c1c" />
                  </Pressable>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />

      {/* create */}
      <ChorePostModal
        visible={showPost}
        onClose={() => setShowPost(false)}
        onSubmit={postChore}
        templates={templates}
        onDeleteTemplate={deleteTemplate}
        assigneeOptions={doneByOptions}
      />

      {/* edit */}
      {editing && (
        <ChorePostModal
          visible={!!editing}
          onClose={() => setEditing(null)}
          onSubmit={(vals) => onEdit(editing.id, vals)}
          initial={{ title: editing.title, points: editing.points }}
          titleText="Edit Chore"
          submitText="Save"
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FBFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  h1: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  postTxt: { color: '#fff', fontWeight: '800' },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tabActive: {
    backgroundColor: '#2563eb15',
    borderColor: '#2563eb',
  },
  tabLabel: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
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

  actions: { flexDirection: 'row', gap: 8, marginRight: 2 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  deleteBtn: { backgroundColor: '#fee2e2' },

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
