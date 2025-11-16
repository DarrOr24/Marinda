// app/profile/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import CheckerboardBackground from '@/components/checkerboard-background';
import MemberSidebar from '@/components/members-sidebar';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useFamily } from '@/lib/families/families.hooks';
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime';
import {
  fetchMemberPointsHistory,
  type PointsEntry,
} from '@/lib/points/points.api';

export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeFamilyId } = useAuthContext();
  const { members, family } = useFamily(activeFamilyId || undefined);

  const [history, setHistory] = useState<PointsEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useSubscribeTableByFamily('family_members', activeFamilyId ?? undefined, [
    'family-members',
    activeFamilyId,
  ]);

  // 🔄 Always refetch members when entering this screen or switching profile
  useEffect(() => {
    if (activeFamilyId && members?.refetch) {
      members.refetch();
    }
  }, [activeFamilyId, id]);

  // Load recent points history for this member from points_ledger
  useEffect(() => {
    if (!activeFamilyId || !id) return;

    let cancelled = false;

    (async () => {
      try {
        setHistoryLoading(true);
        setHistoryError(null);

        const rows = await fetchMemberPointsHistory(activeFamilyId, id);
        if (cancelled) return;

        setHistory(rows);
      } catch (e) {
        console.error('fetchMemberPointsHistory failed', e);
        if (!cancelled) {
          setHistoryError('Could not load points history.');
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeFamilyId, id]);

  if (!activeFamilyId) {
    return (
      <View style={[styles.screen, styles.centerOnly]}>
        <Text style={styles.subtitle}>No family selected yet</Text>
      </View>
    );
  }

  if (members.isLoading) {
    return (
      <View style={[styles.screen, styles.centerOnly]}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>Loading family…</Text>
      </View>
    );
  }

  if (members.isError) {
    return (
      <View style={[styles.screen, styles.centerOnly]}>
        <Text style={styles.subtitle}>Failed to load members</Text>
      </View>
    );
  }

  const memberList = members.data ?? [];
  const current = memberList.find((m) => m.id === id);
  const points = (current as any)?.points ?? 0;

  const formatEntryDate = (iso: string | null | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const humanKind = (kind?: string | null) => {
    if (!kind) return '';
    if (kind === 'chore_earn') return 'Chore';
    if (kind === 'reward_spend') return 'Reward';
    if (kind === 'manual_adjust') return 'Adjustment';
    return kind;
  };

  return (
    <View style={styles.screen}>
      <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

      {/* Left sidebar */}
      <MemberSidebar />

      {/* Center content */}
      <View style={styles.center}>
        <Text style={styles.title}>
          {current
            ? `${current.nickname || current.profile?.first_name || 'Member'}'s Profile`
            : 'Profile'}
        </Text>
        <Text style={styles.subtitle}>
          {family.data?.name ? `Family: ${family.data.name}` : 'Activities feed'}
        </Text>

        {/* Points card – now for everyone (kids + parents) */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Points</Text>
          <Text style={styles.pointsValue}>{points}</Text>
        </View>

        {/* Recent points activity */}
        <View style={styles.card}>
          <Text style={styles.historyTitle}>Recent points activity</Text>

          {historyLoading && (
            <View style={styles.historyEmpty}>
              <ActivityIndicator size="small" />
              <Text style={styles.historyEmptyText}>Loading points…</Text>
            </View>
          )}

          {!historyLoading && historyError && (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyText}>{historyError}</Text>
            </View>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyText}>
                No points activity yet for this member.
              </Text>
            </View>
          )}

          {!historyLoading &&
            !historyError &&
            history.length > 0 && (
              <View style={styles.historyList}>
                {history.map((entry) => (
                  <View key={entry.id} style={styles.historyRow}>
                    <Text
                      style={[
                        styles.historyDelta,
                        entry.delta > 0
                          ? styles.historyDeltaPositive
                          : styles.historyDeltaNegative,
                      ]}
                    >
                      {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyReason}>
                        {entry.reason || 'Points update'}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {humanKind(entry.kind)} • {formatEntryDate(entry.created_at)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E6F4FE',
  },
  centerOnly: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  card: {
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardText: { color: '#334155' },
  pointsCard: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
    minWidth: 150,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e3a8a',
    marginTop: 6,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  historyList: {
    marginTop: 4,
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  historyDelta: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 40,
  },
  historyDeltaPositive: {
    color: '#16a34a',
  },
  historyDeltaNegative: {
    color: '#b91c1c',
  },
  historyReason: {
    fontSize: 13,
    color: '#111827',
  },
  historyMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  historyEmpty: {
    marginTop: 8,
    paddingVertical: 8,
  },
  historyEmptyText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
