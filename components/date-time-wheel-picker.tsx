// components/date-time-wheel-picker.tsx
import {
  getShortMonthFromDateString,
  getWeekDayFromDateString,
  getYearFromDateString,
} from "@/utils/format.utils";
import WheelPicker from "@quidone/react-native-wheel-picker";
import { Audio } from "expo-av";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Button } from "@/components/ui/button";


const DAYS_OFFSET = 30;
const ITEM_HEIGHT = 60;
const LOOP_REPEAT = 5;
const MIDDLE_CYCLE = 3;

type Props = {
  visible: boolean;
  initialDateStr: string;
  initialTime?: string; // "HH:MM"
  onCancel: () => void;
  onConfirm: (value: { dateStr: string; time: string }) => void;
};

export function DateTimeWheelPicker({
  visible,
  initialDateStr,
  initialTime,
  onCancel,
  onConfirm,
}: Props) {
  // --------- SOUND SETUP ----------
  const tickSoundRef = useRef<Audio.Sound | null>(null);
  const lastTickRef = useRef(0);
  const mutedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      mutedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("@/assets/sounds/camera-shutter-click.wav"),
          { volume: 0.7 }
        );
        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }
        tickSoundRef.current = sound;
      } catch (e) {
        console.warn("Failed to load wheel tick sound", e);
      }
    })();

    return () => {
      isMounted = false;
      if (tickSoundRef.current) {
        tickSoundRef.current.unloadAsync();
        tickSoundRef.current = null;
      }
    };
  }, []);

  function playTick() {
    if (mutedRef.current) return;

    const now = Date.now();
    if (now - lastTickRef.current < 10) return;
    lastTickRef.current = now;

    const sound = tickSoundRef.current;
    if (!sound) return;

    sound
      .setPositionAsync(0)
      .then(() => sound.playAsync())
      .catch(() => { });
  }

  // --------- DATE/TIME DATA ----------

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_OFFSET * 2 + 1 }, (_, i) => {
        const date = new Date(initialDateStr + "T00:00:00");
        date.setDate(date.getDate() + (i + 1 - DAYS_OFFSET));
        return date.toISOString().split("T")[0];
      }),
    [initialDateStr]
  );

  const baseHours = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
    []
  );
  const baseMinutes = useMemo(
    () => Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0")),
    []
  );

  const hoursData = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    for (let cycle = 0; cycle < LOOP_REPEAT; cycle++) {
      for (const h of baseHours) {
        result.push({ value: `${h}|${cycle}`, label: h });
      }
    }
    return result;
  }, [baseHours]);

  const minutesData = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    for (let cycle = 0; cycle < LOOP_REPEAT; cycle++) {
      for (const m of baseMinutes) {
        result.push({ value: `${m}|${cycle}`, label: m });
      }
    }
    return result;
  }, [baseMinutes]);

  function parseInitialTime(time?: string): [string, string] {
    if (!time) return ["12", "00"];
    const [hh, mm] = time.split(":");
    return [hh.padStart(2, "0"), mm.padStart(2, "0")];
  }

  function makeHourValue(base: string, cycle = MIDDLE_CYCLE) {
    return `${base}|${cycle}`;
  }

  function makeMinuteValue(base: string, cycle = MIDDLE_CYCLE) {
    return `${base}|${cycle}`;
  }

  const [initialHour, initialMinute] = parseInitialTime(initialTime);

  const [dayIndex, setDayIndex] = useState(DAYS_OFFSET);
  const [hourValue, setHourValue] = useState(() => {
    const base = baseHours.includes(initialHour) ? initialHour : baseHours[0];
    return makeHourValue(base);
  });
  const [minuteValue, setMinuteValue] = useState(() => {
    const base = baseMinutes.includes(initialMinute) ? initialMinute : baseMinutes[0];
    return makeMinuteValue(base);
  });

  // re-sync while closed, so opening is instant with no wheel animation
  useEffect(() => {
    if (!visible) {
      const [hh, mm] = parseInitialTime(initialTime);
      const safeHour = baseHours.includes(hh) ? hh : baseHours[0];
      const safeMinute = baseMinutes.includes(mm) ? mm : baseMinutes[0];

      setDayIndex(DAYS_OFFSET);
      setHourValue(makeHourValue(safeHour));
      setMinuteValue(makeMinuteValue(safeMinute));
    }
  }, [visible, initialDateStr, initialTime, baseHours, baseMinutes]);

  const selectedDay = days[dayIndex];
  const selectedHour = hourValue.split("|")[0];
  const selectedMinute = minuteValue.split("|")[0];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} />

        <View style={styles.sheet}>
          <Text style={styles.title}>
            {`${getWeekDayFromDateString(selectedDay)}, `}
            {`${getShortMonthFromDateString(selectedDay)}, `}
            {`${getYearFromDateString(selectedDay)}`}
          </Text>

          <View style={styles.pickersRow}>
            {/* Day */}
            <View style={styles.pickerCol}>
              <WheelPicker
                data={days.map((d) => ({
                  value: d,
                  label: getShortMonthFromDateString(d, true),
                }))}
                value={selectedDay}
                onValueChanging={({ item: { value } }) => {
                  setDayIndex(days.indexOf(value));
                  playTick();
                }}
                enableScrollByTapOnItem
                itemHeight={ITEM_HEIGHT}
                overlayItemStyle={styles.overlayItemStyle}
                renderOverlay={() => <OverlayItem />}
              />
            </View>

            {/* Hour */}
            <View style={styles.pickerCol}>
              <WheelPicker
                data={hoursData}
                value={hourValue}
                onValueChanging={({ item: { value } }) => {
                  setHourValue(value);
                  playTick();
                }}
                enableScrollByTapOnItem
                itemHeight={ITEM_HEIGHT}
                overlayItemStyle={styles.overlayItemStyle}
                renderOverlay={() => <OverlayItem />}
              />
            </View>

            {/* Minute */}
            <View style={styles.pickerCol}>
              <WheelPicker
                data={minutesData}
                value={minuteValue}
                onValueChanging={({ item: { value } }) => {
                  setMinuteValue(value);
                  playTick();
                }}
                enableScrollByTapOnItem
                itemHeight={ITEM_HEIGHT}
                overlayItemStyle={styles.overlayItemStyle}
                renderOverlay={() => <OverlayItem />}
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              title="Cancel"
              type="ghost"
              size="md"
              uppercase
              onPress={() => {
                mutedRef.current = true;
                onCancel();
              }}
            />
            <Button
              title="Ok"
              type="ghost"
              size="md"
              uppercase
              onPress={() => {
                mutedRef.current = true;
                onConfirm({
                  dateStr: selectedDay,
                  time: `${selectedHour}:${selectedMinute}`,
                });
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OverlayItem() {
  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: "transparent",
        height: "100%",
        width: 120,
        position: "relative",
      }}
    >
      <View
        style={{
          backgroundColor: "#d1d5db",
          height: 1,
          width: "100%",
          position: "absolute",
          top: "42%",
        }}
      />
      <View
        style={{
          backgroundColor: "#d1d5db",
          height: 1,
          width: "100%",
          position: "absolute",
          bottom: "42%",
        }}
      />
    </View>
  );
}

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
    alignItems: "center",
    marginHorizontal: 8,
    marginTop: 4,
  },
  pickerCol: {
    flex: 1,
    alignItems: "center",
  },
  overlayItemStyle: {
    backgroundColor: "transparent",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 8,
  },
});
