// components/modals/add-activity-modal.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ChipSelector } from "@/components/chip-selector";
import { DateRangePicker } from "@/components/date-range-picker";
import { DateTimeWheelPicker } from "@/components/date-time-wheel-picker";
import { ModalCard, ModalShell, useModalScrollMaxHeight } from "@/components/ui";
import { buildRecurrenceRule } from "@/lib/activities/activities.recurrence";
import type { RecurrenceFreq, RecurrenceRule } from "@/lib/activities/activities.types";
import { MembersSelector } from "../members-selector";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";

const ICON_SIZE = 20;

type RecurrenceEndMode = "never" | "count" | "until";

function endOfLocalDayIso(d: Date): string {
  const end = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999
  );
  return end.toISOString();
}

function formatShortDateFromIso(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FormFieldRow({
  icon,
  first,
  children,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  first?: boolean;
  children: React.ReactNode;
}) {
  const arr = React.Children.toArray(children);
  const label = arr[0];
  const content = arr.slice(1);

  return (
    <View style={[styles.formRow, first && styles.formRowFirst]}>
      <View style={styles.labelRow}>
        <View style={styles.iconCol}>
          <MaterialCommunityIcons name={icon} size={ICON_SIZE} color="#64748b" />
        </View>
        {label}
      </View>
      {content.length > 0 ? (
        <View style={styles.formCol}>{content}</View>
      ) : null}
    </View>
  );
}

export type NewActivityForm = {
  title: string;
  start_at: string;
  end_at: string;
  location?: string;
  money?: number;
  ride_needed?: boolean;
  present_needed?: boolean;
  babysitter_needed?: boolean;
  participants_member_ids?: string[];
  notes?: string;
  /** When set, creates an `activity_series` row instead of a one-off activity. */
  recurrence?: RecurrenceRule;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (form: NewActivityForm) => void;

  initialDateStr: string;
  mode?: "create" | "edit";
  submitLabel?: string;
  initial?: Partial<NewActivityForm>;
};

export default function AddActivityModal({
  visible,
  onClose,
  onSave,
  initialDateStr,
  mode = "create",
  submitLabel,
  initial,
}: Props) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [money, setMoney] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [range, setRange] = useState<{ start_at: string; end_at: string } | null>(
    null
  );

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] =
    useState<RecurrenceFreq>("WEEKLY");
  const [intervalStr, setIntervalStr] = useState("1");
  const [endMode, setEndMode] = useState<RecurrenceEndMode>("never");
  const [countStr, setCountStr] = useState("10");
  const [untilEndIso, setUntilEndIso] = useState<string | null>(null);
  const [untilPickerOpen, setUntilPickerOpen] = useState(false);

  // keep defaults in sync when modal opens with different initial / edit
  useEffect(() => {
    if (!visible) return;

    setTitle(initial?.title ?? "");
    setLocation(initial?.location ?? "");
    setMoney(
      initial?.money !== undefined && initial?.money !== null
        ? String(initial?.money)
        : ""
    );

    setFlags([
      ...(initial?.ride_needed ? ["ride_needed"] : []),
      ...(initial?.present_needed ? ["present_needed"] : []),
      ...(initial?.babysitter_needed ? ["babysitter_needed"] : []),
    ]);

    setSelectedIds(initial?.participants_member_ids ?? []);
    setNotes(initial?.notes ?? "");
    setRange(
      initial?.start_at && initial?.end_at
        ? { start_at: initial.start_at, end_at: initial.end_at }
        : null
    );

    setRepeatEnabled(false);
    setRecurrenceFreq("WEEKLY");
    setIntervalStr("1");
    setEndMode("never");
    setCountStr("10");
    setUntilEndIso(null);
    setUntilPickerOpen(false);
  }, [visible, initialDateStr, initial]);

  useEffect(() => {
    if (!visible || !range?.start_at || endMode !== "until") return;
    setUntilEndIso((prev) => {
      if (prev != null) return prev;
      const s = new Date(range.start_at);
      s.setDate(s.getDate() + 30);
      return endOfLocalDayIso(s);
    });
  }, [visible, range?.start_at, endMode]);

  const scrollMaxHeight = useModalScrollMaxHeight(200);
  const firstStartMs = range ? new Date(range.start_at).getTime() : 0;
  const untilMs = untilEndIso ? new Date(untilEndIso).getTime() : 0;
  const intervalN = parseInt(intervalStr, 10) || 0;
  const countN = parseInt(countStr, 10) || 0;

  const recurrenceValid =
    mode !== "create" ||
    !repeatEnabled ||
    (intervalN >= 1 &&
      intervalN <= 999 &&
      (endMode === "never" ||
        (endMode === "count" && countN >= 1) ||
        (endMode === "until" &&
          !!untilEndIso &&
          untilMs >= firstStartMs)));

  const canSave =
    title.trim().length > 0 && !!range?.start_at && recurrenceValid;

  function reset() {
    setTitle("");
    setLocation("");
    setMoney("");
    setFlags([]);
    setSelectedIds([]);
    setNotes("");
    setRange(null);
    setRepeatEnabled(false);
    setRecurrenceFreq("WEEKLY");
    setIntervalStr("1");
    setEndMode("never");
    setCountStr("10");
    setUntilEndIso(null);
    setUntilPickerOpen(false);
  }

  function handleSave() {
    if (!canSave || !range) return;

    let recurrence: RecurrenceRule | undefined;
    if (mode === "create" && repeatEnabled) {
      const firstStart = new Date(range.start_at);
      const end =
        endMode === "never"
          ? ({ type: "never" } as const)
          : endMode === "count"
            ? ({ type: "count", count: countN } as const)
            : ({
                type: "until",
                untilIso: untilEndIso!,
              } as const);
      recurrence = buildRecurrenceRule(
        recurrenceFreq,
        intervalN || 1,
        firstStart,
        end
      );
    }

    const payload: NewActivityForm = {
      title: title.trim(),
      start_at: range.start_at,
      end_at: range.end_at,
      location: location.trim() || undefined,
      money: money ? Number(money) : undefined,

      ride_needed: flags.includes("ride_needed") || undefined,
      present_needed: flags.includes("present_needed") || undefined,
      babysitter_needed: flags.includes("babysitter_needed") || undefined,

      participants_member_ids: selectedIds.length ? selectedIds : undefined,
      notes: notes.trim() || undefined,
      ...(recurrence ? { recurrence } : {}),
    };

    onSave(payload);
    onClose();
    if (mode === "create") reset();
  }

  return (
    <ModalShell visible={visible} onClose={onClose} keyboardOffset={40}>
      <ModalCard style={styles.sheet} maxHeightPadding={24} bottomPadding={12}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === "edit" ? "Edit Activity" : "New Activity"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ maxHeight: scrollMaxHeight }}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 0 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled
        >
          <FormFieldRow icon="clock-outline" first>
            <Text style={styles.label}>When *</Text>
            <DateRangePicker
              baseDateStr={initialDateStr}
              initialStartAt={initial?.start_at}
              initialEndAt={initial?.end_at}
              onChange={setRange}
              hideLabel
            />
          </FormFieldRow>

          {mode === "create" ? (
            <View style={styles.formRow}>
              <View style={styles.labelRow}>
                <View style={styles.iconCol}>
                  <MaterialCommunityIcons
                    name="calendar-sync"
                    size={ICON_SIZE}
                    color="#64748b"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.repeatHeaderRow}>
                    <Text style={styles.label}>Repeat</Text>
                    <Switch
                      value={repeatEnabled}
                      onValueChange={setRepeatEnabled}
                      trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                      thumbColor={repeatEnabled ? "#2563eb" : "#f4f4f5"}
                    />
                  </View>
                  <Text style={styles.repeatHint}>
                    Never ends, or stop after a number of times, or on a date
                    (like Google Calendar).
                  </Text>
                </View>
              </View>

              {repeatEnabled ? (
                <View style={styles.recurrenceBlock}>
                  <Text style={styles.subLabel}>Every</Text>
                  <View style={styles.everyRow}>
                    <TextInput
                      placeholder="1"
                      keyboardType="number-pad"
                      value={intervalStr}
                      onChangeText={setIntervalStr}
                      style={styles.intervalInput}
                    />
                    <ChipSelector
                      value={recurrenceFreq}
                      onChange={(v) => v && setRecurrenceFreq(v as RecurrenceFreq)}
                      options={[
                        { label: "Day", value: "DAILY" },
                        { label: "Week", value: "WEEKLY" },
                        { label: "Month", value: "MONTHLY" },
                      ]}
                      horizontal
                      horizontalContentContainerStyle={{
                        justifyContent: "flex-start",
                      }}
                    />
                  </View>

                  <Text style={styles.subLabel}>Ends</Text>
                  <ChipSelector
                    value={endMode}
                    onChange={(v) => v && setEndMode(v as RecurrenceEndMode)}
                    options={[
                      { label: "Never", value: "never" },
                      { label: "After", value: "count" },
                      { label: "On date", value: "until" },
                    ]}
                    horizontal
                    horizontalContentContainerStyle={{
                      justifyContent: "flex-start",
                    }}
                  />

                  {endMode === "count" ? (
                    <View style={styles.countRow}>
                      <TextInput
                        placeholder="10"
                        keyboardType="number-pad"
                        value={countStr}
                        onChangeText={setCountStr}
                        style={styles.countInput}
                      />
                      <Text style={styles.countSuffix}>occurrences</Text>
                    </View>
                  ) : null}

                  {endMode === "until" ? (
                    <TouchableOpacity
                      style={styles.untilTap}
                      onPress={() => setUntilPickerOpen(true)}
                    >
                      <MaterialCommunityIcons
                        name="calendar"
                        size={18}
                        color="#2563eb"
                      />
                      <Text style={styles.untilTapText}>
                        {untilEndIso
                          ? formatShortDateFromIso(untilEndIso)
                          : "Choose end date"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          <FormFieldRow icon="format-title">
            <Text style={styles.label}>Title *</Text>
            <TextInput
              placeholder="e.g., Soccer practice"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              autoCapitalize="words"
            />
          </FormFieldRow>

          <FormFieldRow icon="map-marker-outline">
            <Text style={styles.label}>Location</Text>
            <TextInput
              placeholder="e.g., Community Center"
              value={location}
              onChangeText={setLocation}
              style={styles.input}
            />
          </FormFieldRow>

          <FormFieldRow icon="cash">
            <Text style={styles.label}>Amount ($)</Text>
            <TextInput
              placeholder="e.g., 15"
              keyboardType="numeric"
              value={money}
              onChangeText={setMoney}
              style={styles.input}
            />
          </FormFieldRow>

          <FormFieldRow icon="flag-outline">
            <Text style={styles.label}>Flags</Text>
            <ChipSelector
              multiple
              values={flags}
              onChange={setFlags}
              options={[
                { label: "Ride", value: "ride_needed" },
                { label: "Present", value: "present_needed" },
                { label: "Babysitter", value: "babysitter_needed" },
              ]}
              renderOption={(opt, active) => (
                <View style={styles.chipContent}>
                  <MaterialCommunityIcons
                    name={
                      opt.value === "ride_needed"
                        ? "car-outline"
                        : opt.value === "present_needed"
                          ? "gift-outline"
                          : "baby-face-outline"
                    }
                    size={16}
                    color={active ? "#fff" : "#64748b"}
                  />
                  <Text
                    style={[
                      styles.chipLabel,
                      active && styles.chipLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </View>
              )}
            />
          </FormFieldRow>

          <FormFieldRow icon="account-group-outline">
            <Text style={styles.label}>Who's going?</Text>
            <MembersSelector
              values={selectedIds}
              onChange={setSelectedIds}
              containerStyle={{ marginTop: 2, marginBottom: 0 }}
            />
          </FormFieldRow>

          <FormFieldRow icon="note-text-outline">
            <Text style={styles.label}>Notes</Text>
            <TextInput
              placeholder="Add a note…"
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, styles.notesInput]}
              multiline
            />
          </FormFieldRow>
        </ScrollView>

        <View style={styles.actions}>
          <Button type="outline" size="sm" title="Cancel" onPress={onClose} />
          <Button
            type="primary"
            size="sm"
            title={submitLabel ?? (mode === "edit" ? "Update" : "Save")}
            onPress={handleSave}
            disabled={!canSave}
          />
        </View>
      </ModalCard>

      <DateTimeWheelPicker
        visible={untilPickerOpen}
        initialAt={untilEndIso ?? range?.start_at}
        onCancel={() => setUntilPickerOpen(false)}
        onConfirm={(iso) => {
          setUntilEndIso(endOfLocalDayIso(new Date(iso)));
          setUntilPickerOpen(false);
        }}
      />
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: "100%",
    maxWidth: 460,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  title: { fontSize: 18, fontWeight: "800", color: "#0f172a" },

  label: {
    fontSize: 13,
    color: "#475569",
    marginTop: 0,
    marginBottom: 0,
    fontWeight: "700",
  },

  formRow: {
    marginTop: 14,
  },
  formRowFirst: { marginTop: 0 },
  repeatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  repeatHint: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 16,
  },
  recurrenceBlock: {
    marginTop: 10,
    marginLeft: 36,
    gap: 8,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 4,
  },
  everyRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  intervalInput: {
    width: 52,
    minHeight: 40,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  countInput: {
    width: 56,
    minHeight: 40,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  countSuffix: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
  untilTap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignSelf: "flex-start",
  },
  untilTapText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCol: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  formCol: { flex: 1, minWidth: 0, marginTop: 6 },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipLabel: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  chipLabelActive: { color: "#fff", fontWeight: "600" },
  notesInput: { minHeight: 80 },

  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  input: { flex: 1 },

  scrollContent: { paddingBottom: 16, gap: 2 },

  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
});
