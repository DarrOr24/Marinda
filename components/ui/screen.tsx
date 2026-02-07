// components/ui/screen.tsx
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import CheckerboardBackground from "../checkerboard-background";

type Props = {
  children: React.ReactNode;
  gap?: "no" | "sm" | "md" | "lg";
  bottomOffset?: number;

  /** ✅ NEW: floating UI like FAB */
  overlay?: React.ReactNode;
};

export function Screen({
  children,
  gap = "md",
  bottomOffset = 0,
  overlay,
}: Props) {
  const insets = useSafeAreaInsets();

  const gapStyle =
    gap === "no"
      ? 0
      : gap === "sm"
        ? 8
        : gap === "md"
          ? 16
          : gap === "lg"
            ? 24
            : 16;

  const paddingBottom = 24 + insets.bottom + bottomOffset;

  return (
    <SafeAreaView style={styles.safe}>
      <CheckerboardBackground />

      {/* ✅ Stage wrapper */}
      <View style={styles.stage}>
        {/* ✅ Scroll content */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.content,
            { gap: gapStyle, paddingBottom },
          ]}
        >
          {children}
        </ScrollView>

        {/* ✅ Overlay layer OUTSIDE scroll */}
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
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  stage: {
    flex: 1,
    position: "relative",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
