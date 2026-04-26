import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { isRtl as isRtlLang } from "@/lib/i18n";

export type RtlStyles = {
  /** Horizontal row; flips to row-reverse in RTL */
  row: { flexDirection: "row" | "row-reverse" };
  /** Logical start margin (left in LTR, right in RTL) */
  marginStart: (n: number) => { marginLeft?: number; marginRight?: number };
  /** Logical end margin (right in LTR, left in RTL) */
  marginEnd: (n: number) => { marginLeft?: number; marginRight?: number };
  /** Logical start padding */
  paddingStart: (n: number) => { paddingLeft?: number; paddingRight?: number };
  /** Logical end padding */
  paddingEnd: (n: number) => { paddingLeft?: number; paddingRight?: number };
  /** Push content to the logical end (marginLeft/Right: "auto") */
  flexEnd: { marginLeft?: "auto"; marginRight?: "auto" };
  /** Text align start */
  textAlignStart: { textAlign: "left" | "right" };
  /** Text align end */
  textAlignEnd: { textAlign: "left" | "right" };
  /** Self-align to logical start (left in LTR, right in RTL) */
  alignSelfStart: { alignSelf: "flex-start" | "flex-end" };
  /** Self-align to logical end (right in LTR, left in RTL) */
  alignSelfEnd: { alignSelf: "flex-start" | "flex-end" };
  /** Align flex children to logical start */
  alignItemsStart: { alignItems: "flex-start" | "flex-end" };
  /** Align flex children to logical end */
  alignItemsEnd: { alignItems: "flex-start" | "flex-end" };
  /** Vertical axis is not mirrored for reading direction */
  justifyContentStart: { justifyContent: "flex-start" };
  /** Writing direction (ltr | rtl) */
  writingDirection: { writingDirection: "ltr" | "rtl" };
};

export type UseRtlStylesReturn = RtlStyles & {
  /** Whether the current language is RTL. Use for logic (e.g. Swipeable actions, icon choice). */
  rtl: boolean;
};

export function useRtlStyles(): UseRtlStylesReturn {
  const { i18n } = useTranslation();
  const rtl = isRtlLang(i18n.language);

  return useMemo(
    () => ({
      rtl,
      row: {
        flexDirection: rtl ? "row-reverse" : "row",
      },
      marginStart: (n: number) =>
        rtl ? { marginRight: n } : { marginLeft: n },
      marginEnd: (n: number) =>
        rtl ? { marginLeft: n } : { marginRight: n },
      paddingStart: (n: number) =>
        rtl ? { paddingRight: n } : { paddingLeft: n },
      paddingEnd: (n: number) =>
        rtl ? { paddingLeft: n } : { paddingRight: n },
      flexEnd: rtl ? { marginRight: "auto" } : { marginLeft: "auto" },
      textAlignStart: { textAlign: rtl ? "right" : "left" },
      textAlignEnd: { textAlign: rtl ? "left" : "right" },
      alignSelfStart: { alignSelf: rtl ? "flex-end" : "flex-start" },
      alignSelfEnd: { alignSelf: rtl ? "flex-start" : "flex-end" },
      alignItemsStart: { alignItems: rtl ? "flex-end" : "flex-start" },
      alignItemsEnd: { alignItems: rtl ? "flex-start" : "flex-end" },
      justifyContentStart: { justifyContent: "flex-start" },
      writingDirection: { writingDirection: rtl ? "rtl" : "ltr" },
    }),
    [rtl],
  );
}
