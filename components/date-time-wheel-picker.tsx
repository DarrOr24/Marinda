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
import { padNumber2 } from "@/utils/format.utils";


const DAYS_OFFSET = 30;
const ITEM_HEIGHT = 60;
const LOOP_REPEAT = 5;
const MIDDLE_CYCLE = 3;

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

  const baseDate = useMemo(() => {
    const d = initialAt ? new Date(initialAt) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [initialAt]);

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_OFFSET * 2 + 1 }, (_, i) => {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + (i + 1 - DAYS_OFFSET));
        return date.toISOString().split("T")[0];
      }),
    [baseDate]
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

  const initialTimeStr = useMemo(() => {
    if (!initialAt) return undefined;
    const d = new Date(initialAt);
    const hh = padNumber2(d.getHours());
    const rawMinutes = d.getMinutes();
    const rounded = Math.round(rawMinutes / 5) * 5;
    const safe = rounded >= 60 ? 55 : rounded;
    return `${hh}:${padNumber2(safe)}`;
  }, [initialAt]);

  const [initialHour, initialMinute] = parseInitialTime(initialTimeStr);

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
      const d = initialAt ? new Date(initialAt) : new Date();
      const hh = padNumber2(d.getHours());
      const rawMinutes = d.getMinutes();
      const rounded = Math.round(rawMinutes / 5) * 5;
      const safe = rounded >= 60 ? 55 : rounded;
      const [hhSafe, mmSafe] = parseInitialTime(`${hh}:${padNumber2(safe)}`);

      const safeHour = baseHours.includes(hhSafe) ? hhSafe : baseHours[0];
      const safeMinute = baseMinutes.includes(mmSafe) ? mmSafe : baseMinutes[0];

      setDayIndex(DAYS_OFFSET);
      setHourValue(makeHourValue(safeHour));
      setMinuteValue(makeMinuteValue(safeMinute));
    }
  }, [visible, initialAt, baseHours, baseMinutes]);

  const selectedDay = days[dayIndex];
  const selectedHour = hourValue.split("|")[0];
  const selectedMinute = minuteValue.split("|")[0];

  // build final Date in local time from selected day+time
  function buildSelectedDate(): Date {
    return new Date(`${selectedDay}T${selectedHour}:${selectedMinute}:00`);
  }

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
                const selectedDate = buildSelectedDate();
                onConfirm(selectedDate.toISOString());
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
