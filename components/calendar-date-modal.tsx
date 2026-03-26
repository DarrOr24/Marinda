import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

import { Button } from "@/components/ui";

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

function addYearsYmd(ymd: string, years: number): string {
  const parts = ymd.split("-").map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setFullYear(dt.getFullYear() + years);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
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

export function CalendarDateModal({
  visible,
  initialAt,
  minDateYmd,
  maxDateYmd,
  title = "Choose date",
  onCancel,
  onConfirm,
}: Props) {
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
    for (let y = end; y >= start; y--) arr.push(y);
    return arr;
  }, [minDate, maxDate]);

  const selectedYear = Number(current.slice(0, 4));

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <View style={styles.sheet}>
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
                  data={years}
                  keyExtractor={(y) => String(y)}
                  numColumns={3}
                  columnWrapperStyle={{ gap: 10 }}
                  contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
                  style={{ maxHeight: 260 }}
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
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    padding: 18,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    maxHeight: "90%",
  },
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
