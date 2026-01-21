// components/ui/modal-card.tsx
import React from "react";
import { Dimensions, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = ViewProps & {
    bottomPadding?: number;     // extra padding inside card (above safe area)
    maxHeightPadding?: number;  // how much space to keep outside card
};

export function ModalCard({
    style,
    bottomPadding = 12,
    maxHeightPadding = 24,
    ...props
}: Props) {
    const insets = useSafeAreaInsets();
    const screenH = Dimensions.get("window").height;

    const maxH = screenH - insets.top - insets.bottom - maxHeightPadding;

    return (
        <View
            {...props}
            style={[
                {
                    maxHeight: maxH,
                    paddingBottom: bottomPadding + insets.bottom,
                },
                style,
            ]}
        />
    );
}
