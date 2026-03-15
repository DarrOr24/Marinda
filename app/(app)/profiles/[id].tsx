// app/profiles/[id].tsx
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppHeader } from "@/components/app-header";
import { MemberAvatar } from "@/components/avatar/member-avatar";
import { ChipSelector } from "@/components/chip-selector";
import { Button, Screen, ScreenState, TextInput } from "@/components/ui";
import WeeklyPointsChart from "@/components/weekly-points-chart";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useFamily } from "@/lib/families/families.hooks";
import {
  adjustMemberPoints,
  fetchMemberPointsHistory,
  type PointsEntry,
} from "@/lib/points/points.api";
import { memberDisplayName } from "@/utils/format.utils";
import { familyName } from "@/utils/format.utils";

type MemberProfileScreenProps = {
  memberIdParam?: string;
};

export function MemberProfileScreen({ memberIdParam }: MemberProfileScreenProps) {
  const {
    activeFamilyId,
    effectiveMember,
    hasParentPermissions,
    isKidMode,
  } = useAuthContext() as any;
  const { family, familyMembers } = useFamily(activeFamilyId);

  const [history, setHistory] = useState<PointsEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // manual adjust UI state
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [selectedKidId, setSelectedKidId] = useState<string | undefined>(memberIdParam);

  // Recent activity time range: 7, 30, or 90 days
  const [historyRangeDays, setHistoryRangeDays] = useState<number>(30);

  const adminMemberId: string | undefined = (effectiveMember as any)?.id;

  const memberList = familyMembers.data ?? [];
  const selfMemberId: string | undefined = (effectiveMember as any)?.id;
  const switcherKids = memberList.filter((member: any) => member.role === "CHILD" || member.role === "TEEN");
  const hasKidsInFamily = switcherKids.length > 0;
  const fallbackParentMemberId = switcherKids[0]?.id ?? selfMemberId;
  const isRouteDrivenProfile = Boolean(memberIdParam);
  const resolvedMemberId = hasParentPermissions
    ? (memberIdParam ?? selectedKidId ?? fallbackParentMemberId)
    : selfMemberId;

  // ✅ kids/teens always see ONLY their own profile
  const viewedMemberId = resolvedMemberId;

  useEffect(() => {
    if (!hasParentPermissions && selfMemberId && memberIdParam && memberIdParam !== selfMemberId) {
      router.replace({
        pathname: "/profiles/[id]",
        params: { id: selfMemberId },
      });
    }
  }, [hasParentPermissions, selfMemberId, memberIdParam]);

  useEffect(() => {
    if (!hasParentPermissions || isRouteDrivenProfile) return;

    setSelectedKidId((currentId) => {
      if (currentId && switcherKids.some((kid: any) => kid.id === currentId)) {
        return currentId;
      }

      return fallbackParentMemberId;
    });
  }, [fallbackParentMemberId, hasParentPermissions, isRouteDrivenProfile, switcherKids]);

  // ✅ member being viewed (for points card)
  const current = memberList.find((m: any) => m.id === viewedMemberId);
  const points = (current as any)?.points ?? 0;
  const profileTitle = current
    ? isKidMode
      ? memberDisplayName(current)
      : `${memberDisplayName(current)}'s Profile`
    : "Profile";

  useAppHeader({
    title: profileTitle,
    hiddenTitle: false,
  });

  // 🔄 Always refetch members when entering this screen or switching profile
  useEffect(() => {
    if (activeFamilyId && familyMembers?.refetch) {
      familyMembers.refetch();
    }
  }, [activeFamilyId, viewedMemberId]);

  // Load recent points history for this member from points_ledger
  useEffect(() => {
    if (!activeFamilyId || !viewedMemberId) return;

    const since = new Date();
    since.setDate(since.getDate() - historyRangeDays);
    const sinceISO = since.toISOString();

    let cancelled = false;

    (async () => {
      try {
        setHistoryLoading(true);
        setHistoryError(null);

        const rows = await fetchMemberPointsHistory(
          activeFamilyId,
          viewedMemberId,
          50,
          sinceISO
        );

        if (cancelled) return;
        setHistory(rows);
      } catch (e) {
        console.error("fetchMemberPointsHistory failed", e);
        if (!cancelled) {
          setHistoryError("Could not load points history.");
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
  }, [activeFamilyId, viewedMemberId, historyRangeDays]);


  const handleAdjustPoints = async () => {
    if (!activeFamilyId || !viewedMemberId) return;

    const raw = adjustDelta.trim();

    // ❗ Accept ONLY whole integers (optional minus sign + digits)
    const integerPattern = /^-?\d+$/;

    if (!integerPattern.test(raw)) {
      Alert.alert(
        "Invalid number",
        "Points must be a whole number (e.g., 10 or -5). Decimal values are not allowed."
      );
      return;
    }

    const deltaNum = Number(raw);

    if (deltaNum === 0) {
      Alert.alert(
        "Check points",
        "Enter a positive or negative whole number, for example 10 or -5."
      );
      return;
    }

    const reason = adjustReason.trim();
    if (!reason) {
      Alert.alert("Add a reason", "Please add a short reason for this adjustment.");
      return;
    }

    try {
      setAdjustSaving(true);

      await adjustMemberPoints({
        familyId: activeFamilyId,
        memberId: viewedMemberId,
        delta: deltaNum,
        reason,
        approverMemberId: adminMemberId ?? null,
      });

      setAdjustDelta("");
      setAdjustReason("");

      if (familyMembers?.refetch) familyMembers.refetch();
      const since = new Date();
      since.setDate(since.getDate() - historyRangeDays);
      const rows = await fetchMemberPointsHistory(
        activeFamilyId,
        viewedMemberId,
        50,
        since.toISOString()
      );
      setHistory(rows);
    } catch (e) {
      console.error("adjustMemberPoints failed", e);
      Alert.alert("Error", "Could not adjust points. Please try again.");
    } finally {
      setAdjustSaving(false);
    }
  };

  if (!activeFamilyId) {
    return (
      <ScreenState
        title="Profile"
        description="No family selected yet."
      />
    );
  }

  if (familyMembers.isLoading) {
    return (
      <ScreenState
        title="Profile"
        description="Loading family members."
        showActivityIndicator
      />
    );
  }

  if (familyMembers.isError) {
    return (
      <ScreenState
        title="Profile"
        description="Failed to load family members."
      />
    );
  }

  if (!hasKidsInFamily) {
    return (
      <Screen withBackground scroll={false} centerContent>
        <View style={styles.emptyStateContent}>
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>The {familyName(family.data)} family has been successfully created!</Text>
            <Text style={styles.emptyStateBody}>
              To start tracking points, chores, and activities, add your kids to the family.
            </Text>
          </View>

          <View style={styles.emptyStateButtons}>
            <Button
              title="Add family members"
              type="primary"
              size="lg"
              showShadow
              fullWidth
              bold
              onPress={() => router.push("/settings/family")}
              leftIcon={<MaterialCommunityIcons name="account-group-outline" size={20} />}
            />
            <Button
              title="Get started"
              type="outline"
              size="lg"
              fullWidth
              bold
              onPress={() => router.push("/getting-started")}
              leftIcon={<MaterialCommunityIcons name="play-circle-outline" size={20} />}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const formatEntryDate = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const humanKind = (kind?: string | null) => {
    if (!kind) return "";
    if (kind === "chore_earn") return "Chore";
    if (kind === "reward_spend") return "Reward";
    if (kind === "manual_adjust") return "Adjustment";
    return kind;
  };

  return (
    <Screen
      withBackground
      fixedHeader={
        hasParentPermissions && switcherKids.length > 0 ? (
          <View style={styles.profileTabs}>
            {switcherKids.map((kid: any) => {
              const isActive = kid.id === viewedMemberId;

              return (
                <Pressable
                  key={kid.id}
                  style={styles.profileTab}
                  onPress={() => {
                    if (isRouteDrivenProfile) {
                      router.replace({
                        pathname: "/profiles/[id]",
                        params: { id: kid.id },
                      });
                      return;
                    }

                    setSelectedKidId(kid.id);
                  }}
                >
                  <View style={[styles.profileAvatarWrap, isActive && styles.profileAvatarWrapActive]}>
                    <MemberAvatar memberId={kid.id} size="md" />
                  </View>
                  <Text style={[styles.profileTabText, isActive && styles.profileTabTextActive]}>
                    {memberDisplayName(kid)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null
      }
    >
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>Points</Text>
        <Text style={styles.pointsValue}>{points}</Text>
      </View>

      {hasParentPermissions && (
        <View style={styles.adjustCard}>
          <Text style={styles.adjustTitle}>Adjust points manually</Text>
          <Text style={styles.adjustHelp}>
            Add or subtract points for this member. Use this for bonuses, corrections,
            or special rewards.
          </Text>

          <TextInput
            label="Points change"
            value={adjustDelta}
            onChangeText={setAdjustDelta}
            keyboardType="number-pad"
            placeholder="e.g. 10 or -5"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <TextInput
            label="Reason"
            value={adjustReason}
            onChangeText={setAdjustReason}
            placeholder="Reason for adjustment"
            multiline
            containerStyle={{ marginTop: 8 }}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <View style={styles.adjustButtonsRow}>
            <Button
              title="Clear"
              type="secondary"
              size="md"
              fullWidth
              onPress={() => {
                setAdjustDelta("");
                setAdjustReason("");
              }}
              disabled={adjustSaving}
              style={{ flex: 1 }}
            />
            <Button
              title={adjustSaving ? "Saving…" : "Save change"}
              type="primary"
              size="md"
              fullWidth
              onPress={handleAdjustPoints}
              disabled={adjustSaving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}

      <WeeklyPointsChart history={history} />

      <View style={styles.card}>
        <Text style={styles.historyTitle}>Recent points activity</Text>

        <ChipSelector
          value={String(historyRangeDays)}
          onChange={(v) => v && setHistoryRangeDays(Number(v))}
          options={[
            { label: "Past week", value: "7" },
            { label: "Past month", value: "30" },
            { label: "Past 3 months", value: "90" },
          ]}
          style={{ marginBottom: 12 }}
        />

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
                    entry.delta > 0 ? styles.historyDeltaPositive : styles.historyDeltaNegative,
                  ]}
                >
                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyReason}>{entry.reason || "Points update"}</Text>
                  <Text style={styles.historyMeta}>
                    {humanKind(entry.kind)} • {formatEntryDate(entry.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );

}

export default function MemberProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <MemberProfileScreen memberIdParam={id} />;
}

const styles = StyleSheet.create({
  emptyStateContent: {
    width: "100%",
    gap: 18,
  },
  emptyStateCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#dbeafe",
    padding: 22,
    alignItems: "flex-start",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyStateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  emptyStateBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
  },
  emptyStateButtons: {
    gap: 12,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  profileTabs: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "center",
    columnGap: 10,
    rowGap: 12,
  },
  profileTab: {
    alignItems: "center",
    width: "18%",
    maxWidth: 60,
    gap: 7,
  },
  profileAvatarWrap: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "transparent",
  },
  profileAvatarWrapActive: {
    borderColor: "#60a5fa",
    backgroundColor: "#dbeafe",
  },
  profileTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },
  profileTabTextActive: {
    color: "#1d4ed8",
  },
  subtitle: {
    fontSize: 14,
    color: "#475569",
  },

  card: {
    borderRadius: 16,
    backgroundColor: "white",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  pointsCard: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignSelf: "flex-start",
    minWidth: 150,
  },
  pointsLabel: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1e3a8a",
    marginTop: 6,
  },

  /* Manual adjust card */
  adjustCard: {
    padding: 14,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    maxWidth: 360,
  },
  adjustTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  adjustHelp: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 10,
  },
  adjustButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  /* History styles */
  historyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  historyList: {
    marginTop: 4,
    gap: 8,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  historyDelta: {
    fontSize: 14,
    fontWeight: "800",
    minWidth: 40,
  },
  historyDeltaPositive: {
    color: "#16a34a",
  },
  historyDeltaNegative: {
    color: "#b91c1c",
  },
  historyReason: {
    fontSize: 13,
    color: "#111827",
  },
  historyMeta: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  historyEmpty: {
    marginTop: 8,
    paddingVertical: 8,
  },
  historyEmptyText: {
    fontSize: 12,
    color: "#6b7280",
  },
});
