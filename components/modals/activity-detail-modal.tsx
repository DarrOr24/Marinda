// components/modals/activity-detail-modal.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { ModalCard } from "@/components/ui/modal-card";
import { ModalShell } from "@/components/ui/modal-shell";
import type { Activity } from "@/lib/activities/activities.types";

function formatTimeFromIso(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Props = {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string) => void;
  memberById: Map<string, any>;
  creatorName: (a: Activity) => string;
  isParent: boolean;
  isCreator: boolean;
};

export function ActivityDetailModal({
  visible,
  activity,
  onClose,
  onApprove,
  onReject,
  onEdit,
  memberById,
  creatorName,
  isParent,
  isCreator,
}: Props) {
  if (!activity) return null;

  const participantIds = activity.participants?.map((p) => p.member_id) ?? [];
  const names = participantIds
    .map((id: string) => {
      const m = memberById.get(id);
      const prof = m?.profile;
      if (prof?.first_name || prof?.last_name) {
        return `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim();
      }
      return m?.name;
    })
    .filter(Boolean)
    .join(", ");

  const start = new Date(activity.start_at);
  const end = new Date(activity.end_at);
  const sameDayRange = sameDay(start, end);
  const startDateLabel = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const endDateLabel = end.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const dateLine = sameDayRange
    ? startDateLabel
    : `${startDateLabel} → ${endDateLabel}`;
  const timeLine = `${formatTimeFromIso(activity.start_at)}–${formatTimeFromIso(activity.end_at)}`;

  const statusLabel =
    activity.status === "APPROVED"
      ? "Approved"
      : activity.status === "NOT_APPROVED"
        ? "Not approved"
        : "Pending approval";

  return (
    <ModalShell visible={visible} onClose={onClose}>
      <ModalCard style={styles.card}>
        <Text style={styles.title}>Activity</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.detailTitle}>{activity.title}</Text>

          <Text style={styles.detailLine}>
            <Text style={styles.detailIcon}>📅</Text> {dateLine}
          </Text>
          <Text style={styles.detailLine}>
            <Text style={styles.detailIcon}>🕒</Text> {timeLine}
          </Text>

          {activity.location && (
            <Text style={styles.detailLine}>
              <Text style={styles.detailIcon}>📍</Text> {activity.location}
            </Text>
          )}
          {typeof activity.money === "number" && (
            <Text style={styles.detailLine}>
              <Text style={styles.detailIcon}>💵</Text> ${activity.money.toFixed(2)}
            </Text>
          )}

          <Text style={styles.detailLine}>
            <Text style={styles.detailIcon}>🚗</Text> Ride:{" "}
            {activity.ride_needed ? "✅" : "❌"}
          </Text>
          <Text style={styles.detailLine}>
            <Text style={styles.detailIcon}>🎁</Text> Present:{" "}
            {activity.present_needed ? "✅" : "❌"}
          </Text>
          <Text style={styles.detailLine}>
            <Text style={styles.detailIcon}>🍼</Text> Babysitter:{" "}
            {activity.babysitter_needed ? "✅" : "❌"}
          </Text>

          <Text style={styles.detailLine}>
            <Text style={styles.detailIcon}>👥</Text> Who's going:{" "}
            {names || "—"}
          </Text>

          {activity.notes && (
            <Text style={styles.detailLine}>
              <Text style={styles.detailIcon}>📝</Text> {activity.notes}
            </Text>
          )}

          <Text style={styles.detailLine}>
            <Text style={styles.detailIcon}>⏳</Text> {statusLabel}
          </Text>
          <Text style={styles.detailLine}>
            <Text style={styles.detailIcon}>👤</Text> {creatorName(activity)}
          </Text>
        </ScrollView>

        <View style={styles.buttons}>
          {isCreator && (
            <Button
              type="outline"
              size="sm"
              title="Edit"
              leftIcon={<MaterialCommunityIcons name="pencil-outline" size={18} />}
              onPress={() => onEdit(activity.id)}
            />
          )}
          {isParent && (
            <>
              <Button
                type="danger"
                size="sm"
                title="Reject"
                leftIcon={<MaterialCommunityIcons name="close" size={18} />}
                onPress={() => onReject(activity.id)}
              />
              <Button
                type="primary"
                size="sm"
                title="Approve"
                leftIcon={<MaterialCommunityIcons name="check" size={18} />}
                onPress={() => onApprove(activity.id)}
              />
            </>
          )}
          <Button
            type="secondary"
            size="sm"
            title="Close"
            onPress={onClose}
          />
        </View>
      </ModalCard>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 280,
  },
  scrollContent: {
    paddingBottom: 8,
    gap: 4,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  detailLine: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  detailIcon: {
    fontSize: 13,
  },
  buttons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
});
