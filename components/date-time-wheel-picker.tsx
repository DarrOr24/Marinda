import React, {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "@/components/ui";
import { WheelPicker } from "./wheel-picker";

import {
  getShortMonthFromDateString,
  getWeekDayFromDateString,
  getYearFromDateString,
  padNumber2,
} from "@/utils/format.utils";

// ───────────────────────────────────────────────────────────────
// CONFIG
// ───────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 50;
const DAY_RANGE = 100;
const LOOP_CYCLES = 5;
const MIDDLE_CYCLE = Math.floor(LOOP_CYCLES / 2) + 1;

// ───────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  initialAt?: string;
  onCancel: () => void;
  onConfirm: (iso: string) => void;
};

export function DateTimeWheelPicker({
  visible,
  initialAt,
  onCancel,
  onConfirm,
}: Props) {
  // ───────────────────────────────────────────────────────────────
  // DATE/TIME SOURCES
  // ───────────────────────────────────────────────────────────────

  function toLocalDateKey(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const baseDate = useMemo(() => {
    return initialAt ? new Date(initialAt) : new Date();
  }, [initialAt]);

  const todayKey = toLocalDateKey(new Date());

  const days = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let offset = -DAY_RANGE; offset <= DAY_RANGE; offset++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + offset);

      const key = toLocalDateKey(d);
      let label: string;

      if (key === todayKey) {
        label = "Today";
      } else {
        const month = monthNames[d.getMonth()];
        const dayNum = d.getDate();
        label = `${month} ${dayNum}`;
      }

      list.push({ value: key, label });
    }

    return list;
  }, [baseDate, todayKey]);

  // find index of initial date
  const initialDayISO = toLocalDateKey(baseDate);
  const initialDayIndex = useMemo(() => {
    return days.findIndex((d) => d.value === initialDayISO);
  }, [days, initialDayISO]);

  // HOURS: 00–23 repeated LOOP_CYCLES times
  const hours = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    for (let cycle = 0; cycle < LOOP_CYCLES; cycle++) {
      for (let h = 0; h < 24; h++) {
        const label = h.toString().padStart(2, "0");
        list.push({
          value: `${label}|${cycle}`,
          label,
        });
      }
    }
    return list;
  }, []);

  // MINUTES: 00–55 (in steps of 5) repeated LOOP_CYCLES times
  const minutes = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    for (let cycle = 0; cycle < LOOP_CYCLES; cycle++) {
      for (let m = 0; m < 60; m += 5) {
        const mm = m.toString().padStart(2, "0");
        list.push({
          value: `${mm}|${cycle}`,
          label: mm,
        });
      }
    }
    return list;
  }, []);

  // Initial hour/minute
  const initialHour = padNumber2(baseDate.getHours());
  const roundedMin = Math.round(baseDate.getMinutes() / 5) * 5;
  const safeMin = roundedMin >= 60 ? 55 : roundedMin;
  const initialMinute = padNumber2(safeMin);

  const initialHourIndex = hours.findIndex((h) => h.label === initialHour && h.value.endsWith(`|${MIDDLE_CYCLE}`));
  const initialMinuteIndex = minutes.findIndex((m) => m.label === initialMinute && m.value.endsWith(`|${MIDDLE_CYCLE}`));

  // ───────────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────────
  const [dayIndex, setDayIndex] = useState(initialDayIndex);
  const [hourIndex, setHourIndex] = useState(initialHourIndex);
  const [minuteIndex, setMinuteIndex] = useState(initialMinuteIndex);

  // Resync when modal closes
  useEffect(() => {
    if (!visible) {
      setDayIndex(initialDayIndex);
      setHourIndex(initialHourIndex);
      setMinuteIndex(initialMinuteIndex);
    }
  }, [visible, initialDayIndex, initialHourIndex, initialMinuteIndex]);

  // ───────────────────────────────────────────────────────────────
  // BUILD FINAL DATE
  // ───────────────────────────────────────────────────────────────

  const selectedDayISO = days[dayIndex]?.value;
  const selectedHour = hours[hourIndex]?.label;
  const selectedMinute = minutes[minuteIndex]?.label;

  function buildSelectedDate() {
    return new Date(`${selectedDayISO}T${selectedHour}:${selectedMinute}:00`);
  }

  // ───────────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} />

        <View style={styles.sheet}>
          {/* Header — full date */}
          <Text style={styles.title}>
            {`${getWeekDayFromDateString(selectedDayISO)}, `}
            {`${getShortMonthFromDateString(selectedDayISO)}, `}
            {`${getYearFromDateString(selectedDayISO)}`}
          </Text>

          <View style={styles.pickersRow}>
            {/* DAY */}
            <View style={styles.pickerCol}>
              <WheelPicker
                data={days}
                initialIndex={dayIndex}
                itemHeight={ITEM_HEIGHT}
                onChange={(val, index) => {
                  setDayIndex(index);
                }}
              />
            </View>

            {/* HOUR */}
            <View style={styles.pickerCol}>
              <WheelPicker
                data={hours}
                initialIndex={hourIndex}
                itemHeight={ITEM_HEIGHT}
                onChange={(_, index) => {
                  setHourIndex(index);
                }}
              />
            </View>

            {/* MINUTE */}
            <View style={styles.pickerCol}>
              <WheelPicker
                data={minutes}
                initialIndex={minuteIndex}
                itemHeight={ITEM_HEIGHT}
                onChange={(_, index) => {
                  setMinuteIndex(index);
                }}
              />
            </View>
            {/* Center selection lines */}
            <View
              style={{
                backgroundColor: "#b0b0b0",
                height: 1,
                width: "100%",
                position: "absolute",
                top: "40%",
              }}
            />
            <View
              style={{
                backgroundColor: "#b0b0b0",
                height: 1,
                width: "100%",
                position: "absolute",
                bottom: "40%",
              }}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button
              title="Cancel"
              type="ghost"
              size="xl"
              uppercase
              onPress={() => {
                onCancel();
              }}
            />

            <Button
              title="Ok"
              type="ghost"
              size="xl"
              uppercase
              onPress={() => {
                onConfirm(buildSelectedDate().toISOString());
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ───────────────────────────────────────────────────────────────
// STYLES
// ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    margin: 16,
    marginBottom: 60,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 16,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    marginTop: 16,
  },
  pickersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 8,
    marginTop: 6,
  },
  pickerCol: {
    flex: 1,
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    gap: 8,
  },
});
