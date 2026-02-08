// components/add-activity-modal.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { DateRangePicker } from "@/components/date-range-picker";
import { MembersSelector } from "../members-selector";

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
  const { height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [money, setMoney] = useState("");
  const [rideNeeded, setRideNeeded] = useState(false);
  const [presentNeeded, setPresentNeeded] = useState(false);
  const [babysitterNeeded, setBabysitterNeeded] = useState(false);
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
    setRideNeeded(!!initial?.ride_needed);
    setPresentNeeded(!!initial?.present_needed);
    setBabysitterNeeded(!!initial?.babysitter_needed);
    setSelectedIds(initial?.participants_member_ids ?? []);
    setNotes(initial?.notes ?? "");
    setRange(
      initial?.start_at && initial?.end_at
        ? { start_at: initial.start_at, end_at: initial.end_at }
        : null
    );
  }, [visible, initialDateStr, initial]);

  // animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 40,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const canSave = title.trim().length > 0 && !!range?.start_at;

  function reset() {
    setTitle("");
    setLocation("");
    setMoney("");
    setRideNeeded(false);
    setPresentNeeded(false);
    setBabysitterNeeded(false);
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
      ride_needed: rideNeeded || undefined,
      present_needed: presentNeeded || undefined,
      babysitter_needed: babysitterNeeded || undefined,
      participants_member_ids: selectedIds.length ? selectedIds : undefined,
      notes: notes.trim() || undefined,
    };

    onSave(payload);
    onClose();
    if (mode === "create") reset();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }], maxHeight: Math.min(height * 0.86, 720) },
        ]}
      >
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
          showsVerticalScrollIndicator={false}
        >
          {/* Start / End (timestamptz) */}
          <DateRangePicker
            baseDateStr={initialDateStr}
            initialStartAt={initial?.start_at}
            initialEndAt={initial?.end_at}
            onChange={setRange}
          />

          {/* Required fields */}
          <Text style={styles.label}>🏷️ Title *</Text>
          <TextInput
            placeholder="e.g., Soccer practice ⚽️"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            autoCapitalize="words"
          />

          {/* Optional fields */}
          <Text style={styles.label}>📍 Place</Text>
          <View style={styles.fieldRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={18}
              color="#475569"
            />
            <TextInput
              placeholder="e.g., Community Center"
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
              keyboardType="numeric"
              value={money}
              onChangeText={setMoney}
              style={styles.input}
            />
          </View>

          {/* Flags */}
          <View className="wrapChipsRow" style={styles.wrapChipsRow}>
            <TouchableOpacity
              onPress={() => setRideNeeded((v) => !v)}
              style={[styles.chip, rideNeeded && styles.chipActive]}
            >
              <Text style={[styles.chipTxt, rideNeeded && styles.chipTxtActive]}>
                🚗 Ride {rideNeeded ? "✅" : "❌"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPresentNeeded((v) => !v)}
              style={[styles.chip, presentNeeded && styles.chipActive]}
            >
              <Text
                style={[styles.chipTxt, presentNeeded && styles.chipTxtActive]}
              >
                🎁 Present {presentNeeded ? "✅" : "❌"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setBabysitterNeeded((v) => !v)}
              style={[styles.chip, babysitterNeeded && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipTxt,
                  babysitterNeeded && styles.chipTxtActive,
                ]}
              >
                🍼 Babysitter {babysitterNeeded ? "✅" : "❌"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Participants */}
          <Text style={styles.label}>👥 Who’s going?</Text>
          <MembersSelector values={selectedIds} onChange={setSelectedIds} />

          {/* Notes */}
          <Text style={styles.label}>📝 Notes</Text>
          <TextInput
            placeholder="Add a note…"
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, { height: 80 }]}
            multiline
          />
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose}>
            <Text style={styles.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, canSave ? styles.btnPrimary : styles.btnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={canSave ? styles.btnPrimaryTxt : styles.btnDisabledTxt}>
              {submitLabel ?? (mode === "edit" ? "Update" : "Save")}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
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
    backgroundColor: "#f9fafb",
  },
  chip: {
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  chipActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  chipTxt: { color: "#0f172a", fontWeight: "800" },
  chipTxtActive: { color: "#1d4ed8" },
  wrapChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  btn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18 },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  btnGhostTxt: { color: "#0f172a", fontWeight: "700" },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnPrimaryTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnDisabled: { backgroundColor: "#e5e7eb" },
  btnDisabledTxt: { color: "#64748b", fontWeight: "800", fontSize: 16 },
});
