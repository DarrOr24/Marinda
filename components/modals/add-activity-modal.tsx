// components/add-activity-modal.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ChipSelector } from "@/components/chip-selector";
import { DateRangePicker } from "@/components/date-range-picker";
import { ModalCard } from "@/components/ui/modal-card";
import { ModalShell } from "@/components/ui/modal-shell";
import { MembersSelector } from "../members-selector";
import { Button } from "../ui/button";

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
    <ModalShell
      visible={visible}
      onClose={onClose}
      keyboardOffset={40}
      backdropStyle={{
        justifyContent: "flex-end",
        paddingHorizontal: 0,
        paddingBottom: 0,
      }}
    >
      <ModalCard style={styles.sheet} maxHeightPadding={24} padded radius={0}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === "edit" ? "Edit Activity ✏️" : "New Activity ✨"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <DateRangePicker
            baseDateStr={initialDateStr}
            initialStartAt={initial?.start_at}
            initialEndAt={initial?.end_at}
            onChange={setRange}
          />

          <Text style={styles.label}>🏷️ Title *</Text>
          <TextInput
            placeholder="e.g., Soccer practice ⚽️"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={styles.label}>📍 Place</Text>
          <View style={styles.fieldRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={18}
              color="#475569"
            />
            <TextInput
              placeholder="e.g., Community Center"
              placeholderTextColor="#94a3b8"
              value={location}
              onChangeText={setLocation}
              style={styles.input}
            />
          </View>

          <Text style={styles.label}>💵 $</Text>
          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="cash" size={18} color="#475569" />
            <TextInput
              placeholder="e.g., 15"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={money}
              onChangeText={setMoney}
              style={styles.input}
            />
          </View>

          <Text style={styles.label}>Flags</Text>
          <ChipSelector
            multiple
            values={flags}
            onChange={setFlags}
            options={[
              { label: "🚗 Ride", value: "ride_needed" },
              { label: "🎁 Present", value: "present_needed" },
              { label: "🍼 Babysitter", value: "babysitter_needed" },
            ]}
          />

          <Text style={styles.label}>👥 Who’s going?</Text>
          <MembersSelector values={selectedIds} onChange={setSelectedIds} />

          <Text style={styles.label}>📝 Notes</Text>
          <TextInput
            placeholder="Add a note…"
            placeholderTextColor="#94a3b8"
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, { height: 80 }]}
            multiline
          />
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // keep it looking like a bottom sheet even though ModalCard sets radius=0
    // (ModalCard uses borderRadius, but we're overriding corners here)
    overflow: "hidden",
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
    marginTop: 10,
    marginBottom: 4,
    fontWeight: "700",
  },

  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#0f172a",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
});
