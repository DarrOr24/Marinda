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
}: ActivityBoardHeaderNavProps) {
  return (
    <View style={styles.headerRow}>
      <BoardNavChevronButton
        direction="left"
        disabled={!canPrev}
        onPress={onPrev}
        accessibilityLabel={prevAccessibilityLabel}
      />
      <View style={styles.headerTitleWrap}>
        <Text
          style={titleVariant === "week" ? styles.titleWeek : styles.titleDay}
          numberOfLines={titleNumberOfLines}
        >
          {title}
        </Text>
      </View>
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
