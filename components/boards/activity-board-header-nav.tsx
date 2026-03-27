import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** Shared with weekly + daily activity headers (slightly smaller than the original 42px tiles). */
export const BOARD_NAV_BTN_SIZE = 36;
export const BOARD_NAV_ICON_SIZE = 22;

type ChevronProps = {
  direction: "left" | "right";
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

export function BoardNavChevronButton({
  direction,
  disabled,
  onPress,
  accessibilityLabel,
}: ChevronProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.navBtn, disabled && styles.navBtnDisabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
    >
      <MaterialCommunityIcons
        name={direction === "left" ? "chevron-left" : "chevron-right"}
        size={BOARD_NAV_ICON_SIZE}
        color={disabled ? "#94a3b8" : "#0f172a"}
      />
    </Pressable>
  );
}

export type ActivityBoardHeaderNavProps = {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  prevAccessibilityLabel: string;
  nextAccessibilityLabel: string;
  /** "This week" uses larger type; day titles are slightly smaller for long dates. */
  titleVariant?: "week" | "day";
  titleNumberOfLines?: number;
  /** Opens month picker (title + calendar icon). */
  onCalendarPress?: () => void;
};

export function ActivityBoardHeaderNav({
  title,
  onPrev,
  onNext,
  canPrev,
  canNext,
  prevAccessibilityLabel,
  nextAccessibilityLabel,
  titleVariant = "week",
  titleNumberOfLines = 1,
  onCalendarPress,
}: ActivityBoardHeaderNavProps) {
  const titleEl = onCalendarPress ? (
    <Pressable
      onPress={onCalendarPress}
      style={styles.titleWithCalendar}
      accessibilityRole="button"
      accessibilityLabel="Choose date, opens calendar"
    >
      <Text
        style={[
          titleVariant === "week" ? styles.titleWeek : styles.titleDay,
          styles.titleInCalendarBtn,
        ]}
        numberOfLines={titleNumberOfLines}
      >
        {title}
      </Text>
      <MaterialCommunityIcons
        name="calendar-month-outline"
        size={titleVariant === "week" ? 22 : 20}
        color="#2563eb"
        style={styles.calendarIcon}
      />
    </Pressable>
  ) : (
    <Text
      style={titleVariant === "week" ? styles.titleWeek : styles.titleDay}
      numberOfLines={titleNumberOfLines}
    >
      {title}
    </Text>
  );

  return (
    <View style={styles.headerRow}>
      <BoardNavChevronButton
        direction="left"
        disabled={!canPrev}
        onPress={onPrev}
        accessibilityLabel={prevAccessibilityLabel}
      />
      <View style={styles.headerTitleWrap}>{titleEl}</View>
      <BoardNavChevronButton
        direction="right"
        disabled={!canNext}
        onPress={onNext}
        accessibilityLabel={nextAccessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  titleWithCalendar: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    maxWidth: "100%",
  },
  calendarIcon: {
    flexShrink: 0,
  },
  titleInCalendarBtn: {
    flexShrink: 1,
    minWidth: 0,
  },
  navBtn: {
    width: BOARD_NAV_BTN_SIZE,
    height: BOARD_NAV_BTN_SIZE,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  titleWeek: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  titleDay: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
});
