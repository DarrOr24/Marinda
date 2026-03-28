// components/modals/activity-detail-modal.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Button,
  ModalCard,
  ModalShell,
  TextInput,
  useModalScrollMaxHeight,
} from "@/components/ui";
import { addActivityToCalendar } from "@/lib/calendar/add-activity-to-calendar";
import { getActivityRowAccentColor } from "@/lib/activities/activities.accent-color";
import { formatActivityTimeRange } from "@/lib/activities/activities.format";
import type { Activity } from "@/lib/activities/activities.types";
import type { FamilyMember } from "@/lib/members/members.types";

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
  iconColor = "#64748b",
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label?: string;
  content: string;
  iconColor?: string;
  onPress?: () => void;
}) {
  const contentNode = (
    <>
      {label ? (
        <Text style={styles.rowLabel}>{label}</Text>
      ) : null}
      <Text style={[styles.rowContent, onPress && styles.rowContentLink]} numberOfLines={4}>
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
    </View>
  );
}

type Props = {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onApprove: (activity: Activity) => void;
  /** Parent rejects; optional note stored for the family. */
  onReject: (activity: Activity, reason: string) => void;
  /** Parent moves approved or rejected activity back to pending. */
  onRevertToPending: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  /** Creator only; one-off shows a confirm alert; recurring is handled by the parent (scope). */
  onDelete?: (activity: Activity) => void;
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
  onRevertToPending,
  onEdit,
  onDelete,
  memberById,
  creatorName,
  isParent,
  isCreator,
}: Props) {
  const scrollMaxHeight = useModalScrollMaxHeight(160);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [calendarBusy, setCalendarBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      setRejectOpen(false);
      setRejectReason("");
      setCalendarBusy(false);
    }
  }, [visible]);

  if (!activity) return null;

  const isBirthday = !!activity.isBirthday;
  const isVirtualSeries = activity.seriesOccurrence != null;
  const canAddToCalendar = !isVirtualSeries;

  const memberMap = memberById as Map<string, FamilyMember>;
  const birthdayAccentHex = isBirthday
    ? getActivityRowAccentColor(activity, memberMap)
    : "#db2777";

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
  const timeLine = formatActivityTimeRange(activity.start_at, activity.end_at);

  const statusLabel =
    activity.status === "APPROVED"
      ? "Approved"
      : activity.status === "NOT_APPROVED"
        ? "Not approved"
        : "Pending approval";

  const parentCanDecide =
    isParent &&
    (activity.status === "PENDING" ||
      activity.status === "APPROVED" ||
      activity.status === "NOT_APPROVED");

  function confirmDelete() {
    if (!onDelete) return;
    if (isVirtualSeries) {
      onDelete(activity);
      return;
    }
    Alert.alert(
      "Delete activity?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(activity),
        },
      ],
    );
  }

  function submitReject() {
    onReject(activity, rejectReason.trim());
    setRejectOpen(false);
    setRejectReason("");
  }

  async function handleAddToCalendar() {
    if (!activity || calendarBusy) return;
    try {
      setCalendarBusy(true);
      await addActivityToCalendar(activity);
    } catch (e) {
      console.error(e);
      Alert.alert(
        "Could not add to calendar",
        "Calendar isn’t available on this device. Try again or update the app.",
      );
    } finally {
      setCalendarBusy(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose}>
      <ModalCard style={styles.card}>
        <Text style={styles.title}>{isBirthday ? "Birthday" : "Activity"}</Text>

        <ScrollView
          style={{ maxHeight: scrollMaxHeight }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled
        >
          {isBirthday ? (
            <View style={styles.birthdayTitleRow}>
              <MaterialCommunityIcons
                name="cake-variant"
                size={26}
                color={birthdayAccentHex}
              />
              <Text
                style={[
                  styles.detailTitle,
                  styles.birthdayDetailTitle,
                  { color: birthdayAccentHex },
                ]}
              >
                {activity.title}
              </Text>
            </View>
          ) : (
            <Text style={styles.detailTitle}>{activity.title}</Text>
          )}
          {isVirtualSeries && !isBirthday ? (
            <Text style={styles.recurringHint}>Recurring series</Text>
          ) : null}

          <DetailRow
            icon="calendar"
            content={dateLine}
          />
          <DetailRow
            icon="clock-outline"
            content={isBirthday ? "All day" : timeLine}
          />

          {!isBirthday && activity.location ? (
            <DetailRow
              icon="map-marker-outline"
              content={activity.location}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location!)}`;
                Linking.openURL(url);
              }}
            />
          ) : null}
          {!isBirthday && typeof activity.money === "number" ? (
            <DetailRow
              icon="cash"
              content={`$${activity.money.toFixed(2)}`}
            />
          ) : null}

          {!isBirthday ? (
            <>
              <DetailRow
                icon="car-outline"
                label="Ride"
                content={activity.ride_needed ? "Yes" : "No"}
              />
              <DetailRow
                icon="gift-outline"
                label="Present"
                content={activity.present_needed ? "Yes" : "No"}
              />
              <DetailRow
                icon="baby-face-outline"
                label="Babysitter"
                content={activity.babysitter_needed ? "Yes" : "No"}
              />
            </>
          ) : null}

          {!isBirthday ? (
            <DetailRow
              icon="account-group-outline"
              label="Who's going"
              content={names || "—"}
            />
          ) : null}

          {!isBirthday && activity.notes ? (
            <DetailRow icon="note-text-outline" content={activity.notes} />
          ) : null}

          {!isBirthday ? (
            <>
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
              {activity.status === "NOT_APPROVED" &&
              activity.rejection_reason?.trim() ? (
                <DetailRow
                  icon="message-text-outline"
                  label="Note from parent"
                  content={activity.rejection_reason.trim()}
                />
              ) : null}
              <DetailRow
                icon="account-outline"
                label="Created by"
                content={creatorName(activity)}
              />
            </>
          ) : null}
        </ScrollView>

        {rejectOpen && isParent && activity.status === "PENDING" ? (
          <View style={styles.rejectBox}>
            <TextInput
              label="Why not approved? (optional)"
              multiline
              placeholder="Add a short note for the family…"
              value={rejectReason}
              onChangeText={setRejectReason}
              containerStyle={styles.rejectInput}
            />
            <View style={styles.rejectActions}>
              <Button
                type="secondary"
                size="sm"
                title="Back"
                onPress={() => {
                  setRejectOpen(false);
                  setRejectReason("");
                }}
              />
              <Button
                type="danger"
                size="sm"
                title="Confirm reject"
                leftIcon={<MaterialCommunityIcons name="close" size={18} />}
                onPress={submitReject}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.buttons}>
          {!isBirthday && isCreator ? (
            <>
              <Button
                type="outline"
                size="sm"
                title="Edit"
                leftIcon={<MaterialCommunityIcons name="pencil-outline" size={18} />}
                onPress={() => onEdit(activity)}
              />
              {onDelete ? (
                <Button
                  type="danger"
                  size="sm"
                  title="Delete"
                  leftIcon={<MaterialCommunityIcons name="trash-can-outline" size={18} />}
                  onPress={confirmDelete}
                />
              ) : null}
            </>
          ) : null}
          {!isBirthday &&
          parentCanDecide &&
          !(rejectOpen && activity.status === "PENDING") ? (
            <>
              {activity.status === "PENDING" && (
                <>
                  <Button
                    type="danger"
                    size="sm"
                    title="Reject"
                    leftIcon={<MaterialCommunityIcons name="close" size={18} />}
                    onPress={() => setRejectOpen(true)}
                  />
                  <Button
                    type="primary"
                    size="sm"
                    title="Approve"
                    leftIcon={<MaterialCommunityIcons name="check" size={18} />}
                    onPress={() => onApprove(activity)}
                  />
                </>
              )}
              {activity.status === "APPROVED" && (
                <Button
                  type="outline"
                  size="sm"
                  title="Change decision"
                  leftIcon={<MaterialCommunityIcons name="undo" size={18} />}
                  onPress={() => onRevertToPending(activity)}
                />
              )}
              {activity.status === "NOT_APPROVED" && (
                <>
                  <Button
                    type="primary"
                    size="sm"
                    title="Approve"
                    leftIcon={<MaterialCommunityIcons name="check" size={18} />}
                    onPress={() => onApprove(activity)}
                  />
                  <Button
                    type="outline"
                    size="sm"
                    title="Change decision"
                    leftIcon={<MaterialCommunityIcons name="undo" size={18} />}
                    onPress={() => onRevertToPending(activity)}
                  />
                </>
              )}
            </>
          ) : null}
          {canAddToCalendar ? (
            <Button
              type="outline"
              size="sm"
              title={calendarBusy ? "Preparing…" : "Add to calendar"}
              disabled={calendarBusy}
              leftIcon={
                <MaterialCommunityIcons name="calendar-plus" size={18} />
              }
              onPress={() => void handleAddToCalendar()}
            />
          ) : null}
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
  recurringHint: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6366f1",
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  birthdayTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  birthdayDetailTitle: {
    flex: 1,
    marginBottom: 0,
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
  rejectBox: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 10,
  },
  rejectInput: { marginBottom: 0 },
  rejectActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
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
