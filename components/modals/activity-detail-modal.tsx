// components/modals/activity-detail-modal.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const ICON_SIZE = 20;
const ROW_GAP = 12;

function DetailRow({
  icon,
  label,
  content,
  yesNo,
  iconColor = "#64748b",
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label?: string;
  content: string;
  yesNo?: boolean;
  iconColor?: string;
  onPress?: () => void;
}) {
  const contentNode = (
    <>
      {label ? (
        <Text style={styles.rowLabel}>{label}</Text>
      ) : null}
      <Text style={[styles.rowContent, onPress && styles.rowContentLink]} numberOfLines={2}>
        {content}
      </Text>
    </>
  );

  return (
    <View style={styles.row}>
      <View style={styles.iconCol}>
        <MaterialCommunityIcons
          name={icon}
          size={ICON_SIZE}
          color={iconColor}
        />
      </View>
      <View style={styles.contentCol}>
        {onPress ? (
          <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.linkPressed]}>
            {contentNode}
          </Pressable>
        ) : (
          contentNode
        )}
      </View>
      {yesNo !== undefined && (
        <View style={styles.rightCol}>
          <MaterialCommunityIcons
            name={yesNo ? "check-circle" : "close-circle"}
            size={ICON_SIZE}
            color={yesNo ? "#16a34a" : "#94a3b8"}
          />
        </View>
      )}
    </View>
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
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollMaxHeight =
    screenH - insets.top - insets.bottom - 24 - 16 - 16 - 120;

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
          style={{ maxHeight: scrollMaxHeight }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.detailTitle}>{activity.title}</Text>

          <DetailRow
            icon="calendar"
            content={dateLine}
          />
          <DetailRow
            icon="clock-outline"
            content={timeLine}
          />

          {activity.location && (
            <DetailRow
              icon="map-marker-outline"
              content={activity.location}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location!)}`;
                Linking.openURL(url);
              }}
            />
          )}
          {typeof activity.money === "number" && (
            <DetailRow
              icon="cash"
              content={`$${activity.money.toFixed(2)}`}
            />
          )}

          <DetailRow
            icon="car-outline"
            label="Ride"
            content={activity.ride_needed ? "Yes" : "No"}
            yesNo={!!activity.ride_needed}
          />
          <DetailRow
            icon="gift-outline"
            label="Present"
            content={activity.present_needed ? "Yes" : "No"}
            yesNo={!!activity.present_needed}
          />
          <DetailRow
            icon="baby-face-outline"
            label="Babysitter"
            content={activity.babysitter_needed ? "Yes" : "No"}
            yesNo={!!activity.babysitter_needed}
          />

          <DetailRow
            icon="account-group-outline"
            label="Who's going"
            content={names || "—"}
          />

          {activity.notes && (
            <DetailRow icon="note-text-outline" content={activity.notes} />
          )}

          <DetailRow
            icon={
              activity.status === "APPROVED"
                ? "check-circle"
                : activity.status === "NOT_APPROVED"
                  ? "close-circle"
                  : "clock-outline"
            }
            label="Status"
            content={statusLabel}
            iconColor={
              activity.status === "APPROVED"
                ? "#16a34a"
                : activity.status === "NOT_APPROVED"
                  ? "#dc2626"
                  : "#f59e0b"
            }
          />
          <DetailRow
            icon="account-outline"
            label="Created by"
            content={creatorName(activity)}
          />
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
          {isParent && activity.status === "PENDING" && (
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
    flexGrow: 0,
    flexShrink: 1,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  scrollContent: {
    paddingBottom: 8,
    gap: 2,
    flexGrow: 0,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 0,
    gap: ROW_GAP,
    minHeight: 36,
  },
  iconCol: {
    width: ICON_SIZE + 4,
    alignItems: "center",
    justifyContent: "center",
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
  },
  rightCol: {
    width: ICON_SIZE + 4,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 1,
  },
  rowContent: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  rowContentLink: {
    color: "#2563eb",
    textDecorationLine: "underline",
  },
  linkPressed: { opacity: 0.7 },
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
