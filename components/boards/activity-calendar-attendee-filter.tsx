// components/boards/activity-calendar-attendee-filter.tsx
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { FamilyMember } from "@/lib/members/members.types";
import { tint } from "@/utils/color.utils";

type Props = {
  members: FamilyMember[];
  loading: boolean;
  mode: "parent" | "kid";
  /** Parent: selected member ids; empty = everyone. */
  parentSelectedIds: string[];
  onParentSelectedIdsChange: (ids: string[]) => void;
  /** Kid: whose calendar. */
  kidScope: "family" | "mine";
  onKidScopeChange: (scope: "family" | "mine") => void;
  /** Kid legend: show "Me" instead of this member’s name (logged-in / effective profile). */
  kidSelfMemberId?: string | null;
};

export function ActivityCalendarAttendeeFilter({
  members,
  loading,
  mode,
  parentSelectedIds,
  onParentSelectedIdsChange,
  kidScope,
  onKidScopeChange,
  kidSelfMemberId,
}: Props) {
  const membersById = useMemo(() => {
    const m: Record<string, FamilyMember> = {};
    for (const x of members) m[x.id] = x;
    return m;
  }, [members]);

  /** Sorted list for kid-mode color legend (read-only). */
  const kidLegendMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const na = (a.nickname || a.profile?.first_name || "").toLowerCase();
      const nb = (b.nickname || b.profile?.first_name || "").toLowerCase();
      if (na !== nb) return na.localeCompare(nb);
      return a.id.localeCompare(b.id);
    });
  }, [members]);

  const everyoneActive = parentSelectedIds.length === 0;

  function memberChipStyle(memberId: string, active: boolean) {
    const m = membersById[memberId];
    const baseColor = m?.color?.hex || "#94a3b8";
    if (!active) return { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" };
    return {
      borderColor: baseColor,
      backgroundColor: tint(baseColor, 0.12),
    };
  }

  function toggleMember(id: string) {
    if (parentSelectedIds.includes(id)) {
      onParentSelectedIdsChange(parentSelectedIds.filter((x) => x !== id));
    } else {
      onParentSelectedIdsChange([...parentSelectedIds, id]);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (!members.length) return null;

  if (mode === "kid") {
    return (
      <View style={[styles.wrap, styles.kidWrap]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.rowContent}
        >
          <Pressable
            onPress={() => onKidScopeChange("family")}
            style={[
              styles.scopeChip,
              kidScope === "family" && styles.scopeChipActive,
            ]}
          >
            <Text
              style={[
                styles.scopeChipText,
                kidScope === "family" && styles.scopeChipTextActive,
              ]}
            >
              Family
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onKidScopeChange("mine")}
            style={[
              styles.scopeChip,
              kidScope === "mine" && styles.scopeChipActive,
            ]}
          >
            <Text
              style={[
                styles.scopeChipText,
                kidScope === "mine" && styles.scopeChipTextActive,
              ]}
            >
              My events
            </Text>
          </Pressable>
        </ScrollView>

        <View
          accessible
          accessibilityLabel="Calendar colors by family member"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.legendRowContent}
          >
            {kidLegendMembers.map((m) => {
              const firstName = m.nickname || m.profile?.first_name || "Unknown";
              const label =
                kidSelfMemberId && m.id === kidSelfMemberId ? "Me" : firstName;
              const dotColor = m.color?.hex || "#94a3b8";
              return (
                <View key={m.id} style={styles.legendPill} pointerEvents="none">
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text style={styles.legendName}>{label}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.rowContent}
      >
        <Pressable
          onPress={() => onParentSelectedIdsChange([])}
          style={[styles.everyoneChip, everyoneActive && styles.everyoneChipActive]}
        >
          <Text
            style={[
              styles.everyoneText,
              everyoneActive && styles.everyoneTextActive,
            ]}
          >
            Everyone
          </Text>
        </Pressable>
        {members.map((m) => {
          const active = parentSelectedIds.includes(m.id);
          const firstName = m.nickname || m.profile?.first_name || "Unknown";
          const dotColor = m.color?.hex || "#94a3b8";
          return (
            <Pressable
              key={m.id}
              onPress={() => toggleMember(m.id)}
              style={[
                styles.memberChip,
                memberChipStyle(m.id, active),
              ]}
            >
              <View style={styles.chipInner}>
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                <Text
                  style={[
                    styles.chipName,
                    active && { color: dotColor, fontWeight: "800" },
                  ]}
                >
                  {firstName}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  kidWrap: {
    gap: 8,
  },
  legendRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  legendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  legendName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  loadingRow: {
    paddingVertical: 8,
    alignItems: "center",
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  everyoneChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    flexShrink: 0,
    alignSelf: "center",
  },
  everyoneChipActive: {
    borderColor: "#2563eb",
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },
  everyoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  everyoneTextActive: {
    color: "#2563eb",
  },
  memberChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: "center",
  },
  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  chipName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  scopeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  scopeChipActive: {
    borderColor: "#2563eb",
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },
  scopeChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  scopeChipTextActive: {
    color: "#2563eb",
  },
});
