// app/profile/[id].tsx
import CheckerboardBackground from '@/components/checkerboard-background';
import { KidSwitcher } from '@/components/kid-switcher';
import MemberSidebar from '@/components/members-sidebar';
import WeeklyPointsChart from '@/components/weekly-points-chart';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useFamily } from '@/lib/families/families.hooks';
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime';
import type { Role } from '@/lib/families/families.types';
import {
  adjustMemberPoints,
  fetchMemberPointsHistory,
  type PointsEntry,
} from '@/lib/points/points.api';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeFamilyId, member } = useAuthContext() as any;
  const { members, family } = useFamily(activeFamilyId || undefined);
  const navigation = useNavigation();

  const [history, setHistory] = useState<PointsEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // manual adjust UI state
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);

  const currentRole = (member?.role as Role) ?? 'TEEN';
  const isParent = currentRole === 'MOM' || currentRole === 'DAD';
  const adminMemberId: string | undefined = (member as any)?.id;

  const memberList = members.data ?? [];
  const current = memberList.find((m) => m.id === id);
  const points = (current as any)?.points ?? 0;

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

  const handleAdjustPoints = async () => {
    if (!activeFamilyId || !id) return;

    const raw = adjustDelta.trim();

    // ❗ Accept ONLY whole integers (optional minus sign + digits)
    const integerPattern = /^-?\d+$/;

    if (!integerPattern.test(raw)) {
      Alert.alert(
        'Invalid number',
        'Points must be a whole number (e.g., 10 or -5). Decimal values are not allowed.'
      );
      return;
    }

    const deltaNum = Number(raw);

    if (deltaNum === 0) {
      Alert.alert(
        'Check points',
        'Enter a positive or negative whole number, for example 10 or -5.'
      );
      return;
    }

    const reason = adjustReason.trim();
    if (!reason) {
      Alert.alert('Add a reason', 'Please add a short reason for this adjustment.');
      return;
    }

    try {
      setAdjustSaving(true);

      await adjustMemberPoints({
        familyId: activeFamilyId,
        memberId: id,
        delta: deltaNum,
        reason,
        approverMemberId: adminMemberId ?? null,
      });

      setAdjustDelta('');
      setAdjustReason('');

      if (members?.refetch) members.refetch();
      const rows = await fetchMemberPointsHistory(activeFamilyId, id);
      setHistory(rows);

    } catch (e) {
      console.error('adjustMemberPoints failed', e);
      Alert.alert('Error', 'Could not adjust points. Please try again.');
    } finally {
      setAdjustSaving(false);
    }
  };


  // Redirect parent away from their own profile page
  useEffect(() => {
    if (!current) return;

    if (current.role === 'MOM' || current.role === 'DAD') {
      const firstKid = memberList.find(
        (m) => m.role === 'CHILD' || m.role === 'TEEN'
      );

      if (firstKid) {
        router.replace({ pathname: '/profile/[id]', params: { id: firstKid.id } });
      }
    }
  }, [current, memberList]);


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
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

      {/* Left sidebar */}
      <MemberSidebar />

      {/* Center content */}
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.center}
            keyboardShouldPersistTaps="handled"
          >

            {isParent && (
              <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
                <KidSwitcher
                  kids={memberList.filter(m => m.role === 'CHILD' || m.role === 'TEEN')}
                  selectedKidId={id}
                  onSelectKid={(kidId) =>
                    router.push({ pathname: '/profile/[id]', params: { id: kidId } })
                  }
                />
              </View>
            )}


            {/* Points card – everyone sees current points */}
            <View style={styles.pointsCard}>
              <Text style={styles.pointsLabel}>Points</Text>
              <Text style={styles.pointsValue}>{points}</Text>
            </View>

            {/* Manual adjust – parents only */}
            {isParent && (
              <View style={styles.adjustCard}>
                <Text style={styles.adjustTitle}>Adjust points manually</Text>
                <Text style={styles.adjustHelp}>
                  Add or subtract points for this member. Use this for bonuses, corrections,
                  or special rewards.
                </Text>

                <Text style={styles.adjustLabel}>Points change</Text>
                <TextInput
                  value={adjustDelta}
                  onChangeText={setAdjustDelta}
                  keyboardType="number-pad"
                  placeholder="e.g. 10 or -5"
                  style={styles.adjustInput}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />

                <Text style={[styles.adjustLabel, { marginTop: 8 }]}>Reason</Text>
                <TextInput
                  value={adjustReason}
                  onChangeText={setAdjustReason}
                  placeholder="Reason for adjustment"
                  style={[styles.adjustInput]}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <View style={styles.adjustButtonsRow}>
                  <Pressable
                    style={[styles.adjustBtn, styles.adjustSecondaryBtn]}
                    onPress={() => {
                      setAdjustDelta('');
                      setAdjustReason('');
                    }}
                    disabled={adjustSaving}
                  >
                    <Text style={styles.adjustBtnText}>Clear</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.adjustBtn,
                      styles.adjustPrimaryBtn,
                      adjustSaving && styles.adjustDisabledBtn,
                    ]}
                    onPress={handleAdjustPoints}
                    disabled={adjustSaving}
                  >
                    <Text style={[styles.adjustBtnText, { color: '#fff' }]}>
                      {adjustSaving ? 'Saving…' : 'Save change'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Weekly points chart */}
            <WeeklyPointsChart history={history} />

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

              {!historyLoading && !historyError && history.length > 0 && (
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
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
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

  /* Manual adjust card */
  adjustCard: {
    marginTop: 8,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 360,
  },
  adjustTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  adjustHelp: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
  adjustLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  adjustInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  adjustReasonInput: {
    marginTop: 2,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  adjustButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  adjustBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustPrimaryBtn: {
    backgroundColor: '#2563eb',
  },
  adjustSecondaryBtn: {
    backgroundColor: '#eef2ff',
  },
  adjustDisabledBtn: {
    opacity: 0.5,
  },
  adjustBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },

  /* History styles */
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
