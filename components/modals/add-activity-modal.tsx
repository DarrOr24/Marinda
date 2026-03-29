// components/modals/add-activity-modal.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CalendarDateModal,
  toLocalYmdFromIso,
} from "@/components/calendar-date-modal";
import { ChipSelector } from "@/components/chip-selector";
import { DateRangePicker } from "@/components/date-range-picker";
import { ModalDialog } from "@/components/ui";
import {
  buildRecurrenceRule,
  formatRecurrenceRuleSummary,
  recurrenceRuleToEditFields,
} from "@/lib/activities/activities.recurrence";
import type { RecurrenceFreq, RecurrenceRule } from "@/lib/activities/activities.types";
import { fetchPlacesAutocomplete } from "@/lib/places/places-autocomplete.api";
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
  /** Overrides the sheet title (create mode: default "New Activity"). */
  headerTitle?: string;
  submitLabel?: string;
  initial?: Partial<NewActivityForm>;
  /**
   * When set in `edit` mode: show repeat / end options for a recurring series
   * ("This and future events"). Omit for "This event only" (exception) edits.
   * `null` = use default repeat controls if fetch failed.
   */
  seriesRecurrenceInitial?: RecurrenceRule | null;
  /**
   * Read-only summary for "This event only" edits (`null` = load failed).
   * Omit when not editing a single occurrence of a series.
   */
  seriesRecurrenceReadOnly?: RecurrenceRule | null;
};

export default function AddActivityModal({
  visible,
  onClose,
  onSave,
  initialDateStr,
  mode = "create",
  headerTitle,
  submitLabel,
  initial,
  seriesRecurrenceInitial,
  seriesRecurrenceReadOnly,
}: Props) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<
    { description: string; placeId: string }[]
  >([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const locationRequestSeq = useRef(0);
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
  /** WEEKLY only: 0–6 Sun–Sat */
  const [byWeekday, setByWeekday] = useState<number[]>([]);

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
    setByWeekday([]);

    if (mode === "edit" && seriesRecurrenceInitial !== undefined) {
      setRepeatEnabled(true);
      if (seriesRecurrenceInitial) {
        const u = recurrenceRuleToEditFields(seriesRecurrenceInitial);
        setRecurrenceFreq(u.freq);
        setIntervalStr(u.intervalStr);
        setEndMode(u.endMode);
        setCountStr(u.countStr);
        setUntilEndIso(u.untilIso);
        setByWeekday(u.byWeekday ?? []);
      } else {
        setRecurrenceFreq("WEEKLY");
        setIntervalStr("1");
        setEndMode("never");
        setCountStr("10");
        setUntilEndIso(null);
        setByWeekday([]);
      }
    }
  }, [visible, initialDateStr, initial, mode, seriesRecurrenceInitial]);

  useEffect(() => {
    if (recurrenceFreq !== "WEEKLY" || !range?.start_at) return;
    const d = new Date(range.start_at).getDay();
    setByWeekday((prev) => {
      if (prev.length === 0) return [d];
      if (prev.includes(d)) return prev;
      return [...prev, d].sort((a, b) => a - b);
    });
  }, [recurrenceFreq, range?.start_at]);

  useEffect(() => {
    if (!visible || !range?.start_at || endMode !== "until") return;
    setUntilEndIso((prev) => {
      if (prev != null) return prev;
      const s = new Date(range.start_at);
      s.setDate(s.getDate() + 30);
      return endOfLocalDayIso(s);
    });
  }, [visible, range?.start_at, endMode]);

  const firstStartMs = range ? new Date(range.start_at).getTime() : 0;
  const untilMs = untilEndIso ? new Date(untilEndIso).getTime() : 0;
  const intervalN = parseInt(intervalStr, 10) || 0;
  const countN = parseInt(countStr, 10) || 0;

  const editSeriesRecurrence =
    mode === "edit" && seriesRecurrenceInitial !== undefined;
  const modalTitle =
    headerTitle ?? (mode === "edit" ? "Edit Activity" : "New Activity");

  const weeklyDaysValid =
    recurrenceFreq !== "WEEKLY" || byWeekday.length >= 1;

  const recurrenceValid =
    (!repeatEnabled && !editSeriesRecurrence) ||
    (intervalN >= 1 &&
      intervalN <= 999 &&
      weeklyDaysValid &&
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
    setByWeekday([]);
    setPlaceSuggestions([]);
    setPlacesLoading(false);
  }

  useEffect(() => {
    return () => {
      if (locationDebounceRef.current) {
        clearTimeout(locationDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setPlaceSuggestions([]);
      setPlacesLoading(false);
    }
  }, [visible]);

  function handleLocationChange(text: string) {
    setLocation(text);
    if (locationDebounceRef.current) {
      clearTimeout(locationDebounceRef.current);
    }

    if (text.trim().length < 2) {
      setPlaceSuggestions([]);
      setPlacesLoading(false);
      return;
    }

    locationDebounceRef.current = setTimeout(() => {
      const query = text.trim();
      if (query.length < 2) return;

      const seq = ++locationRequestSeq.current;
      setPlacesLoading(true);

      void (async () => {
        try {
          const list = await fetchPlacesAutocomplete(query);
          if (locationRequestSeq.current !== seq) return;
          setPlaceSuggestions(list);
        } finally {
          if (locationRequestSeq.current === seq) {
            setPlacesLoading(false);
          }
        }
      })();
    }, 400);
  }

  function pickPlaceSuggestion(description: string) {
    if (locationDebounceRef.current) {
      clearTimeout(locationDebounceRef.current);
    }
    locationRequestSeq.current += 1;
    setLocation(description);
    setPlaceSuggestions([]);
    setPlacesLoading(false);
  }

  function handleSave() {
    if (!canSave || !range) return;

    let recurrence: RecurrenceRule | undefined;
    if ((mode === "create" && repeatEnabled) || editSeriesRecurrence) {
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
        end,
        recurrenceFreq === "WEEKLY" ? byWeekday : null
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
    <>
      <ModalDialog
        visible={visible}
        onClose={onClose}
        size="xl"
        title={modalTitle}
        showCloseButton
        scrollable
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

        {mode === "edit" && seriesRecurrenceReadOnly !== undefined ? (
          <View style={styles.readOnlyRepeatBox}>
            <View style={styles.labelRow}>
              <View style={styles.iconCol}>
                <MaterialCommunityIcons
                  name="calendar-text-outline"
                  size={ICON_SIZE}
                  color="#64748b"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Series repeat</Text>
                {seriesRecurrenceReadOnly ? (
                  <>
                    <Text style={styles.readOnlyRepeatSummary}>
                      {formatRecurrenceRuleSummary(seriesRecurrenceReadOnly)}
                    </Text>
                    <Text style={styles.readOnlyRepeatHint}>
                      This edit only affects this day. To change the repeat rule
                      or end date for the series, choose “This and future
                      events” from the activity details.
                    </Text>
                  </>
                ) : (
                  <Text style={styles.readOnlyRepeatMuted}>
                    Could not load repeat details.
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {mode === "create" || editSeriesRecurrence ? (
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
                  <Text style={styles.label}>
                    {editSeriesRecurrence ? "Repeat (series)" : "Repeat"}
                  </Text>
                  {editSeriesRecurrence ? null : (
                    <Switch
                      value={repeatEnabled}
                      onValueChange={setRepeatEnabled}
                      trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                      thumbColor={repeatEnabled ? "#2563eb" : "#f4f4f5"}
                    />
                  )}
                </View>
                <Text style={styles.repeatHint}>
                  {editSeriesRecurrence
                    ? "Changes here apply to this series from this occurrence forward (end date, count, or frequency)."
                    : "Never ends, or stop after a number of times, or on a date (like Google Calendar)."}
                </Text>
              </View>
            </View>

            {(repeatEnabled || editSeriesRecurrence) ? (
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

                {recurrenceFreq === "WEEKLY" ? (
                  <View style={styles.weekdayRow}>
                    <Text style={styles.subLabel}>On days</Text>
                    <ChipSelector
                      multiple
                      values={byWeekday.map(String)}
                      onChange={(vals) => {
                        const nums = vals
                          .map(Number)
                          .filter((n) => !Number.isNaN(n))
                          .sort((a, b) => a - b);
                        if (nums.length === 0 && range?.start_at) {
                          setByWeekday([
                            new Date(range.start_at).getDay(),
                          ]);
                        } else {
                          setByWeekday(nums);
                        }
                      }}
                      options={[
                        { label: "Sun", value: "0" },
                        { label: "Mon", value: "1" },
                        { label: "Tue", value: "2" },
                        { label: "Wed", value: "3" },
                        { label: "Thu", value: "4" },
                        { label: "Fri", value: "5" },
                        { label: "Sat", value: "6" },
                      ]}
                      horizontal
                      horizontalContentContainerStyle={{
                        justifyContent: "flex-start",
                      }}
                    />
                  </View>
                ) : null}

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
          <View style={styles.locationField}>
            <TextInput
              placeholder="Search for an address or place"
              value={location}
              onChangeText={handleLocationChange}
              style={styles.input}
              autoCorrect={false}
              autoCapitalize="sentences"
            />
            {placesLoading ? (
              <Text style={styles.placesLoadingHint}>Searching…</Text>
            ) : null}
            {placeSuggestions.length > 0 ? (
              <View style={styles.suggestionsBox}>
                <ScrollView
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  style={styles.suggestionsScroll}
                >
                  {placeSuggestions.map((s, i) => (
                    <Pressable
                      key={`${s.placeId}-${i}`}
                      onPress={() => pickPlaceSuggestion(s.description)}
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        pressed && styles.suggestionRowPressed,
                      ]}
                    >
                      <Text style={styles.suggestionText} numberOfLines={3}>
                        {s.description}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
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
          <Text style={styles.label}>Who&apos;s going?</Text>
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
        <View style={styles.actions}>
          <Button type="outline" size="md" title="Cancel" onPress={onClose} />
          <Button
            type="primary"
            size="md"
            title={submitLabel ?? (mode === "edit" ? "Update" : "Save")}
            onPress={handleSave}
            disabled={!canSave}
          />
        </View>
      </ModalDialog>
      <CalendarDateModal
        visible={untilPickerOpen}
        title="Repeat until"
        initialAt={untilEndIso ?? range?.start_at}
        minDateYmd={
          range?.start_at ? toLocalYmdFromIso(range.start_at) : undefined
        }
        onCancel={() => setUntilPickerOpen(false)}
        onConfirm={(endOfLocalDayIso) => {
          setUntilEndIso(endOfLocalDayIso);
          setUntilPickerOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
  readOnlyRepeatBox: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  readOnlyRepeatSummary: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
    marginTop: 6,
    lineHeight: 20,
  },
  readOnlyRepeatHint: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 8,
    lineHeight: 17,
  },
  readOnlyRepeatMuted: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 6,
    fontStyle: "italic",
  },
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
  weekdayRow: {
    gap: 6,
    marginTop: 2,
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

  locationField: {
    width: "100%",
  },
  placesLoadingHint: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  suggestionsBox: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  suggestionsScroll: {
    maxHeight: 176,
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  suggestionRowPressed: {
    backgroundColor: "#f1f5f9",
  },
  suggestionText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
    lineHeight: 20,
  },

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
