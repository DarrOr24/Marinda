import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

import { Button, ModalDialog } from "@/components/ui";

export function toLocalYmdFromIso(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function endOfLocalDayFromYmd(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date().toISOString();
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const end = new Date(y, mo, d, 23, 59, 59, 999);
  return end.toISOString();
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 3-column year grid row height for FlatList scroll metrics (cells + gap). */
const YEAR_GRID_ROW_HEIGHT = 70;
const YEAR_GRID_COLUMNS = 3;

function addYearsYmd(ymd: string, years: number): string {
  const parts = ymd.split("-").map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setFullYear(dt.getFullYear() + years);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type CalendarDatePickerPanelProps = {
  visible: boolean;
  /** ISO string; used to choose initial month / default selection */
  initialAt?: string;
  /** Minimum selectable calendar day (YYYY-MM-DD), local */
  minDateYmd?: string;
  /** Maximum selectable calendar day (YYYY-MM-DD), local; default ~20 years out */
  maxDateYmd?: string;
  title?: string;
  onCancel: () => void;
  /** Receives end-of-local-day ISO for that calendar date */
  onConfirm: (endOfLocalDayIso: string) => void;
};

/**
 * Calendar + year UI only (no `Modal`). Use inside `ModalDialog` or `CalendarDatePickerEmbeddedOverlay`.
 */
export function CalendarDatePickerPanel({
  visible,
  initialAt,
  minDateYmd,
  maxDateYmd,
  title = "Choose date",
  onCancel,
  onConfirm,
}: CalendarDatePickerPanelProps) {
  const defaultMax = useMemo(() => addYearsYmd(todayYmd(), 20), []);
  const maxDate = maxDateYmd ?? defaultMax;
  const minDate = minDateYmd ?? "2000-01-01";

  const initialYmd = useMemo(() => {
    if (initialAt) {
      const ymd = toLocalYmdFromIso(initialAt);
      if (ymd >= minDate && ymd <= maxDate) return ymd;
    }
    const t = todayYmd();
    if (t >= minDate && t <= maxDate) return t;
    return minDate;
  }, [initialAt, minDate, maxDate]);

  const [current, setCurrent] = useState(initialYmd);
  const [yearOpen, setYearOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrent(initialYmd);
      setYearOpen(false);
    }
  }, [visible, initialYmd]);

  const years = useMemo(() => {
    const start = Number(minDate.slice(0, 4));
    const end = Number(maxDate.slice(0, 4));
    const arr: number[] = [];
    for (let y = start; y <= end; y++) arr.push(y);
    return arr;
  }, [minDate, maxDate]);

  const selectedYear = Number(current.slice(0, 4));

  const yearListRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    if (!yearOpen) return;
    const idx = years.indexOf(selectedYear);
    if (idx < 0) return;
    const id = requestAnimationFrame(() => {
      yearListRef.current?.scrollToIndex({
        index: idx,
        animated: false,
        viewPosition: 0,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [yearOpen, selectedYear, years]);

  function handlePickYear(year: number) {
    const mo = current.slice(5, 7);
    const day = current.slice(8, 10);
    let next = `${year}-${mo}-${day}`;
    if (next < minDate) next = minDate;
    if (next > maxDate) next = maxDate;
    setCurrent(next);
    setYearOpen(false);
  }

  return (
    <>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <Pressable
          onPress={() => setYearOpen((v) => !v)}
          style={styles.yearBtn}
          hitSlop={10}
        >
          <Text style={styles.yearBtnText}>Year</Text>
          <Ionicons
            name={yearOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color="#334155"
          />
        </Pressable>
      </View>

      <View style={styles.calendarWrap}>
        {yearOpen ? (
          <View style={styles.yearOverlay}>
            <FlatList
              ref={yearListRef}
              data={years}
              keyExtractor={(y) => String(y)}
              numColumns={YEAR_GRID_COLUMNS}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
              style={{ maxHeight: 260 }}
              getItemLayout={(_, index) => ({
                length: YEAR_GRID_ROW_HEIGHT,
                offset:
                  YEAR_GRID_ROW_HEIGHT *
                  Math.floor(index / YEAR_GRID_COLUMNS),
                index,
              })}
              onScrollToIndexFailed={({ index }) => {
                requestAnimationFrame(() => {
                  yearListRef.current?.scrollToIndex({
                    index,
                    animated: false,
                    viewPosition: 0,
                  });
                });
              }}
              renderItem={({ item: y }) => {
                const active = selectedYear === y;
                return (
                  <Pressable
                    onPress={() => handlePickYear(y)}
                    style={[styles.yearCell, active && styles.yearCellActive]}
                  >
                    <Text
                      style={[
                        styles.yearCellText,
                        active && styles.yearCellTextActive,
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : null}

        {!yearOpen ? (
          <Calendar
            key={current.slice(0, 7)}
            current={current}
            minDate={minDate}
            maxDate={maxDate}
            markedDates={{
              [initialYmd]: {
                selected: true,
                selectedColor: "#2563eb",
              },
            }}
            onDayPress={(day) => {
              onConfirm(endOfLocalDayFromYmd(day.dateString));
            }}
            enableSwipeMonths
            showSixWeeks
            onMonthChange={(m) => setCurrent(m.dateString)}
            theme={{
              todayTextColor: "#2563eb",
              selectedDayBackgroundColor: "#2563eb",
              arrowColor: "#2563eb",
            }}
          />
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button type="outline" size="sm" title="Cancel" onPress={onCancel} />
      </View>
    </>
  );
}

type CalendarDateModalProps = {
  visible: boolean;
  initialAt?: string;
  minDateYmd?: string;
  maxDateYmd?: string;
  title?: string;
  onCancel: () => void;
  onConfirm: (endOfLocalDayIso: string) => void;
};

/** Standalone modal (e.g. “Go to week” on the board). */
export function CalendarDateModal({
  visible,
  initialAt,
  minDateYmd,
  maxDateYmd,
  title = "Choose date",
  onCancel,
  onConfirm,
}: CalendarDateModalProps) {
  return (
    <ModalDialog
      visible={visible}
      onClose={onCancel}
      size="md"
      modalPresentationStyle="overFullScreen"
    >
      <CalendarDatePickerPanel
        visible={visible}
        initialAt={initialAt}
        minDateYmd={minDateYmd}
        maxDateYmd={maxDateYmd}
        title={title}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </ModalDialog>
  );
}

/**
 * Dimmed overlay + card, **without** a second native `Modal`. Use as `modalOverlay` on `ModalDialog`
 * when the parent form is already a modal (iOS nested modals are unreliable).
 */
export function CalendarDatePickerEmbeddedOverlay(
  props: CalendarDatePickerPanelProps,
) {
  return (
    <>
      <Pressable
        style={embeddedStyles.dim}
        onPress={props.onCancel}
        accessibilityRole="button"
        accessibilityLabel="Dismiss calendar"
      />
      <View
        style={embeddedStyles.centerWrap}
        pointerEvents="box-none"
      >
        <View style={embeddedStyles.card}>
          <CalendarDatePickerPanel {...props} />
        </View>
      </View>
    </>
  );
}

const embeddedStyles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
});

const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  yearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  yearBtnText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  calendarWrap: {
    position: "relative",
  },
  yearOverlay: {
    marginBottom: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 8,
  },
  yearCell: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  yearCellActive: {
    borderRadius: 12,
    backgroundColor: "#eff6ff",
  },
  yearCellText: { fontSize: 16, fontWeight: "500", color: "#334155" },
  yearCellTextActive: { fontWeight: "700", color: "#0f172a" },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
