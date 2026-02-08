// components/ui/modal-card.tsx
import React from "react";
import { Dimensions, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = ViewProps & {
    // extra padding inside card (above safe area)
    bottomPadding?: number;

    // how much space to keep outside card
    maxHeightPadding?: number;

    // common modal styling defaults
    padded?: boolean;   // adds internal padding
    elevated?: boolean; // adds elevation/shadow
    radius?: number;    // border radius
};

export function ModalCard({
    style,
    bottomPadding = 12,
    maxHeightPadding = 24,

    // ✅ defaults for consistent modals
    padded = true,
    elevated = true,
    radius = 16,

    ...props
}: Props) {
    const insets = useSafeAreaInsets();
    const screenH = Dimensions.get("window").height;

    // max height so modal never goes behind notch/nav
    const maxH = screenH - insets.top - insets.bottom - maxHeightPadding;

    return (
        <View
            {...props}
            style={[
                {
                    maxHeight: maxH,

                    // safe bottom padding
                    paddingBottom: bottomPadding + insets.bottom,

                    // ✅ shared modal surface style
                    backgroundColor: "#fff",
                    borderRadius: radius,

                    // optional padding + elevation
                    padding: padded ? 20 : 0,
                    elevation: elevated ? 8 : 0,
                },
                style,
            ]}
        />
    );
}
