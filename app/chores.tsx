// app/chores.tsx
import ChoreDetailModal, { ChoreView } from '@/components/chore-detail-modal';
import ChorePostModal from '@/components/chore-post-modal';
import { useAuthContext } from '@/hooks/use-auth-context';
import {
  addChore as apiAddChore,
  approveChore,
  fetchChores,
  rejectChore,
  submitChore,
} from '@/lib/chores/chores.api';
import { useFamily } from '@/lib/families/families.hooks';
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime';
import type { Role } from '@/lib/families/families.types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

type DbStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
const dbToUiStatus = (s: DbStatus): ChoreView['status'] =>
  s === 'OPEN' ? 'open' : s === 'SUBMITTED' ? 'pending' : s === 'APPROVED' ? 'approved' : 'open';

type Proof = { uri: string; kind: 'image' | 'video' };

const shortId = (id?: string) => (id ? `ID ${String(id).slice(0, 8)}` : '—');

export default function Chores() {
  const { activeFamilyId, member, family, members } = useAuthContext() as any;
  const currentRole = (member?.role as Role) ?? 'TEEN';

  // hydrate family + members via React Query
  const { members: membersQuery } = useFamily(activeFamilyId || undefined);
  useSubscribeTableByFamily('family_members', activeFamilyId || undefined, ['family-members', activeFamilyId]);

  // Build a stable resolver: family_member_id -> display name
  const nameForId = useMemo(() => {
    const list = (membersQuery?.data ?? members?.data ?? members ?? family?.members ?? []) as any[];
    const map: Record<string, string> = {};
    for (const m of list) {
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
  }, [membersQuery?.data, members, family]);

  // Current signed-in family_member_id (for mutations)
  const myFamilyMemberId: string | undefined = useMemo(() => {
    if (member?.id) return member.id as string; // already a family_member record
    const list = (membersQuery?.data ?? members?.data ?? members ?? family?.members ?? []) as any[];
    const authUserId = member?.profile?.id || member?.user_id || member?.profile_id;
    const me = list.find((m) => m?.user_id === authUserId || m?.profile?.id === authUserId || m?.profile_id === authUserId);
    return me?.id as string | undefined;
  }, [member, membersQuery?.data, members, family]);

  const myDisplayName = useMemo(() => (myFamilyMemberId ? nameForId(myFamilyMemberId) : '—'), [myFamilyMemberId, nameForId]);

  const isParent = useMemo(() => currentRole === 'MOM' || currentRole === 'DAD', [currentRole]);

  const [list, setList] = useState<ChoreView[]>([]);
  const [showPost, setShowPost] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? list.find((c) => c.id === selectedId) ?? null : null;

  // Load chores from DB (store only IDs/timestamps; names are derived)
  useEffect(() => {
    if (!activeFamilyId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchChores(activeFamilyId);
        if (cancelled) return;
        // when loading
        const mapped: ChoreView[] = (rows ?? []).map((r: any) => ({
          id: r.id,
          title: r.title,
          points: r.points ?? 0,
          status: dbToUiStatus(r.status as DbStatus),
          doneById: r.done_by_member_id ?? undefined,
          doneAt: r.done_at ? new Date(r.done_at).getTime() : undefined,
          approvedById: r.approved_by_member_id ?? undefined,
          approvedAt: r.approved_at ? new Date(r.approved_at).getTime() : undefined,
          notes: r.notes ?? undefined,
          proofs: r.proof_uri && r.proof_kind ? [{ uri: r.proof_uri, kind: r.proof_kind }] : [],
        }));

        setList(mapped);
      } catch (e) {
        console.error('fetchChores failed', e);
        Alert.alert('Error', 'Could not load chores.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFamilyId]);

  // Post a chore (parent)
  const postChore = async ({ title, points }: { title: string; points: number }) => {
    if (!activeFamilyId) return;
    try {
      const row = await apiAddChore(activeFamilyId, { title, points });
      const created: ChoreView = {
        id: row.id,
        title: row.title,
        points: row.points ?? points,
        status: dbToUiStatus(row.status),
        proofs: [],
      };
      setList((prev) => [created, ...prev]);
      setShowPost(false);
    } catch (e) {
      console.error('addChore failed', e);
      Alert.alert('Error', 'Could not post the chore.');
    }
  };

  // Local proofs (client-side only for now)
  const onAttachProof = (id: string, proof: Proof | null) => {
    setList((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (proof === null) return { ...c, proofs: [] };
        return { ...c, proofs: [...(c.proofs ?? []), proof] };
      })
    );
  };

  // Kid submits (SUBMITTED)
  const onMarkPending = async (id: string) => {
    try {
      if (!myFamilyMemberId) throw new Error('Missing family member id');
      const theChore = list.find(c => c.id === id);
      const lastProof = theChore?.proofs?.[theChore.proofs.length - 1];

      const row = await submitChore(id, myFamilyMemberId, lastProof);
      const when = row.done_at ? new Date(row.done_at).getTime() : Date.now();
      const whoId = row.done_by_member_id ?? myFamilyMemberId;

      setList(prev => prev.map(c =>
        c.id === id
          ? {
            ...c,
            status: 'pending',
            doneById: whoId,
            doneAt: when,
            proofs: row.proof_uri && row.proof_kind
              ? [{ uri: row.proof_uri, kind: row.proof_kind }]
              : [],
          }
          : c
      ));
    } catch (e) {
      console.error('submitChore failed', e);
      Alert.alert('Error', 'Could not mark as completed.');
    }
  };


  // Parent approves (APPROVED)
  const onApprove = async (id: string, notes?: string) => {
    try {
      if (!myFamilyMemberId) throw new Error('Missing family member id');
      const row = await approveChore(id, myFamilyMemberId, notes);
      const approverId = row.approved_by_member_id ?? myFamilyMemberId;
      const when = row.approved_at ? new Date(row.approved_at).getTime() : Date.now();
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
    } catch (e) {
      console.error('approveChore failed', e);
      Alert.alert('Error', 'Could not approve the chore.');
    }
  };

  // Parent declines -> OPEN
  const onDecline = async (id: string, notes?: string) => {
    try {
      const row = await rejectChore(id, notes);
      setList(prev => prev.map(c =>
        c.id === id
          ? {
            ...c,
            status: 'open',
            notes: row.notes ?? notes,
            doneById: undefined,
            doneAt: undefined,
            approvedById: undefined,
            approvedAt: undefined,
            proofs: [], // cleared
          }
          : c
      ));
    } catch (e) {
      console.error('rejectChore failed', e);
      Alert.alert('Error', 'Could not decline the chore.');
    }
  };


  function handleOpen(item: ChoreView) {
    if (item.status === 'pending' && !isParent) {
      Alert.alert('Pending approval', 'Only a parent can review this chore.');
      return;
    }
    setSelectedId(item.id);
  }

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

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={list}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => handleOpen(item)} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.points} pts • {item.status === 'open' ? 'Open' : item.status === 'pending' ? 'Pending approval' : 'Approved'}
              </Text>
            </View>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="star-circle-outline" size={18} color="#1e3a8a" />
              <Text style={styles.badgeTxt}>{item.points}</Text>
            </View>
          </Pressable>
        )}
      />

      <ChorePostModal visible={showPost} onClose={() => setShowPost(false)} onSubmit={postChore} />

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
          // NEW: give modal a resolver so it always shows the correct name
          nameForId={nameForId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FBFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  h1: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  postTxt: { color: '#fff', fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeTxt: { color: '#1e3a8a', fontWeight: '800' },
});
