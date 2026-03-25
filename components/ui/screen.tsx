// components/ui/screen.tsx
import React from "react";
import {
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CheckerboardBackground from "../checkerboard-background";

type Props = {
  children: React.ReactNode;
  gap?: "no" | "sm" | "md" | "lg";
  withBackground?: boolean;
  centerContent?: boolean;
  fixedHeader?: React.ReactNode;

  // ✅ optional floating UI (FAB, etc) rendered above scroll
  overlay?: React.ReactNode;

  // optional override for content padding (e.g. paddingTop to reduce space below nav header)
  contentStyle?: ViewStyle;
  scroll?: boolean;
  /** Passed to ScrollView; use `none` when the user should scroll without dismissing the keyboard. */
  keyboardDismissMode?: ScrollViewProps["keyboardDismissMode"];
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
};

export function Screen({
  children,
  gap = "md",
  withBackground = true,
  centerContent = false,
  fixedHeader,
  overlay,
  contentStyle,
  scroll = true,
  keyboardDismissMode = "on-drag",
  keyboardShouldPersistTaps = "handled",
}: Props) {
  const gapStyle =
    gap === "no" ? 0 : gap === "sm" ? 8 : gap === "md" ? 16 : gap === "lg" ? 24 : 16;

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      {withBackground && (
        <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />
      )}

      {/* stage keeps overlay OUTSIDE scroll but on top */}
      <View style={styles.stage}>
        {fixedHeader ? (
          <View style={styles.fixedHeader}>
            {fixedHeader}
          </View>
        ) : null}

        {scroll ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              fixedHeader ? styles.contentWithFixedHeader : null,
              centerContent && styles.scrollCenteredContent,
              { gap: gapStyle },
              contentStyle,
            ]}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode={keyboardDismissMode}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.content,
              styles.staticContent,
              fixedHeader ? styles.contentWithFixedHeader : null,
              centerContent && styles.staticCenteredContent,
              { gap: gapStyle },
              contentStyle,
            ]}
          >
            {children}
          </View>
        )}

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
  screen: { flex: 1, backgroundColor: "#F7FBFF" },
  stage: { flex: 1, position: "relative" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  contentWithFixedHeader: { paddingTop: 0 },
  scrollCenteredContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  /** Helps nested `ScrollView` + `flex: 1` children size and scroll reliably. */
  staticContent: { flex: 1, minHeight: 0 },
  staticCenteredContent: { justifyContent: "center", alignItems: "center" },
  fixedHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
});
