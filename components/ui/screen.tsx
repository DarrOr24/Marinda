// components/ui/screen.tsx
import React from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import CheckerboardBackground from "../checkerboard-background";

type Props = {
  children: React.ReactNode;
  gap?: "no" | "sm" | "md" | "lg";
  bottomOffset?: number;
  withBackground?: boolean;

  // ✅ optional floating UI (FAB, etc) rendered above scroll
  overlay?: React.ReactNode;

  // optional override for content padding (e.g. paddingTop to reduce space below nav header)
  contentStyle?: ViewStyle;
};

export function Screen({
  children,
  gap = "md",
  bottomOffset = 0,
  withBackground = true,
  overlay,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();

  const gapStyle =
    gap === "no" ? 0 : gap === "sm" ? 8 : gap === "md" ? 16 : gap === "lg" ? 24 : 16;

  const paddingBottom = 24 + insets.bottom + bottomOffset;

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      {withBackground && (
        <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />
      )}

      {/* stage keeps overlay OUTSIDE scroll but on top */}
      <View style={styles.stage}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom }, { gap: gapStyle }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>

        {overlay ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {overlay}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E6F4FE" },
  stage: { flex: 1, position: "relative" },
  scroll: { flex: 1 },
  content: { padding: 16 },
});
