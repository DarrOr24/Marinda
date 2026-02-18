// components/modals/add-activity-modal.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ChipSelector } from "@/components/chip-selector";
import { DateRangePicker } from "@/components/date-range-picker";
import { ModalCard, useModalScrollMaxHeight } from "@/components/ui/modal-card";
import { ModalShell } from "@/components/ui/modal-shell";
import { MembersSelector } from "../members-selector";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";

const ICON_SIZE = 20;

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
  }, [visible, initialDateStr, initial]);

  const scrollMaxHeight = useModalScrollMaxHeight(140);
  const canSave = title.trim().length > 0 && !!range?.start_at;

  function reset() {
    setTitle("");
    setLocation("");
    setMoney("");
    setFlags([]);
    setSelectedIds([]);
    setNotes("");
    setRange(null);
  }

  function handleSave() {
    if (!canSave || !range) return;

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
          showsVerticalScrollIndicator={false}
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
