import ChoreDetailModal, { ChoreView } from '@/components/chore-detail-modal';
import ChorePostModal from '@/components/chore-post-modal';
import { useAuthContext } from '@/hooks/use-auth-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Role } from '@/lib/families/families.types';
type Proof = { uri: string; kind: 'image' | 'video' };

export default function Chores() {
  const { member } = useAuthContext();
  const currentRole = member?.role as Role;

  const [list, setList] = useState<ChoreView[]>([
    { id: 'seed-1', title: 'Make your bed', points: 5, status: 'open', proofs: [] },
  ]);
  const [showPost, setShowPost] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isParent = useMemo(() => currentRole === 'MOM' || currentRole === 'DAD', [currentRole]);
  const selected = selectedId ? list.find(c => c.id === selectedId) ?? null : null;

  const postChore = ({ title, points }: { title: string; points: number }) => {
    setList(prev => [{ id: `local-${Date.now()}`, title, points, status: 'open', proofs: [] }, ...prev]);
    setShowPost(false);
  };

  // accepts null to clear all proofs
  const onAttachProof = (id: string, proof: Proof | null) => {
    setList(prev =>
      prev.map(c => {
        if (c.id !== id) return c;
        if (proof === null) return { ...c, proofs: [] };
        return { ...c, proofs: [...(c.proofs ?? []), proof] };
      }),
    );
  };

  const onMarkPending = (id: string) => {
    const when = Date.now();
    const whoId = member?.profile?.id;
    const whoName = member?.profile?.first_name;

    setList(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, status: 'pending', doneById: whoId, doneByName: whoName, doneAt: when }
          : c,
      ) as ChoreView[],
    );
  };

  const onApprove = (id: string, notes?: string) => {
    const approverId = member?.profile?.id;
    const approverName = member?.profile?.first_name;

    setList(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, status: 'approved', notes, approvedById: approverId, approvedByName: approverName }
          : c,
      ) as ChoreView[],
    );
  };

  const onDecline = (id: string, notes?: string) => {
    setList(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, status: 'open', notes, doneById: undefined, doneByName: undefined, doneAt: undefined }
          : c,
      ) as ChoreView[],
    );
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

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={list}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelectedId(item.id)} style={styles.card}>
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
          chore={selected}                        // always the fresh object from list
          currentRole={currentRole}
          onClose={() => setSelectedId(null)}
          onAttachProof={onAttachProof}
          onMarkPending={onMarkPending}
          onApprove={onApprove}
          onDecline={onDecline}
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
