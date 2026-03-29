// app/wishlist-settings.tsx
import React, { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";

import { DocsPageLayout, DocsSection, docsPageStyles } from "@/components/docs-page-layout";
import { Button, ModalDialog, ScreenState, TextInput } from "@/components/ui";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useParentPermissionGuard } from "@/hooks/use-parent-permission-guard";
import {
    useFamilyWishlistSettings,
    useUpdateWishlistSettings,
} from "@/lib/wishlist/wishlist-settings.hooks";

const CURRENCIES = ["CAD", "USD", "EUR", "GBP", "ILS"];

export default function WishlistSettingsScreen() {
    const { activeFamilyId } = useAuthContext() as any;
    const { hasParentPermissions, requireParent } = useParentPermissionGuard({
        message: "Only parents can change wishes settings.",
    });

    const {
        data: settings,
        isLoading,
        isError,
    } = useFamilyWishlistSettings(activeFamilyId);

    const updateSettings = useUpdateWishlistSettings(activeFamilyId);

    const [currency, setCurrency] = useState("CAD");
    const [pointsRate, setPointsRate] = useState("10");
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [selfFulfillMaxPrice, setSelfFulfillMaxPrice] = useState("");

    useEffect(() => {
        if (settings) {
            setCurrency(settings.currency);
            setPointsRate(String(settings.points_per_currency));
            setSelfFulfillMaxPrice(
                settings.self_fulfill_max_price != null
                    ? String(settings.self_fulfill_max_price)
                    : ""
            );
        }
    }, [settings]);

    const onSave = () => {
        if (!requireParent()) return;
        if (!activeFamilyId) return;

        const num = Number(pointsRate);
        if (!num || num <= 0) {
            Alert.alert("Invalid value", "Points must be greater than zero.");
            return;
        }

        // 👇 build payload SAFELY
        const payload: {
            currency: string;
            points_per_currency: number;
            self_fulfill_max_price?: number | null;
        } = {
            currency,
            points_per_currency: num,
        };

        const trimmed = selfFulfillMaxPrice.trim();

        if (trimmed === "") {
            // explicit clear
            payload.self_fulfill_max_price = null;
        } else {
            const parsed = Number(trimmed);
            if (Number.isNaN(parsed) || parsed < 0) {
                Alert.alert(
                    "Invalid value",
                    "Max price must be a number (0 or higher)."
                );
                return;
            }
            payload.self_fulfill_max_price = parsed;
        }

        updateSettings.mutate(payload, {
            onSuccess: () =>
                Alert.alert("Saved!", "Settings updated successfully."),
            onError: (err) => {
                console.log("Wishlist settings update error:", err);
                Alert.alert("Error", "Could not update settings.");
            },
        });
    };


    const onChangeRate = (txt: string) => {
        // Remove everything that isn't a digit
        let cleaned = txt.replace(/[^0-9]/g, "");

        // Prevent leading zero unless the value is exactly "0"
        if (cleaned.length > 1 && cleaned.startsWith("0")) {
            cleaned = cleaned.replace(/^0+/, "");
        }

        // Prevent zero or empty as a valid value
        if (cleaned === "" || cleaned === "0") {
            setPointsRate("");
            return;
        }

        setPointsRate(cleaned);
    };

    if (isLoading) {
        return (
            <ScreenState
                title="Wishes settings"
                description="Loading wishes settings."
                showActivityIndicator
                withBackground={false}
            />
        );
    }

    if (isError) {
        return (
            <ScreenState
                title="Wishes settings"
                description="Failed to load wishes settings."
                withBackground={false}
            />
        );
    }


    return (
        <DocsPageLayout intro="Parents can configure the currency and conversion rate for wish list items.">
            <DocsSection title="Currency">
                <Text style={styles.label}>Currency Type</Text>

                <Pressable
                    onPress={() => {
                        if (!requireParent()) return;
                        setShowCurrencyPicker(true);
                    }}
                    style={[styles.input, styles.dropdownBox, !hasParentPermissions && styles.disabledInput]}
                >
                    <Text style={styles.dropdownText}>{currency}</Text>
                </Pressable>

                {/* Modal */}
                <ModalDialog
                    visible={showCurrencyPicker}
                    onClose={() => setShowCurrencyPicker(false)}
                    presentation="bottom-sheet"
                    size="md"
                    avoidKeyboard={false}
                >
                    {CURRENCIES.map((cur) => (
                        <TouchableOpacity
                            key={cur}
                            style={styles.modalOption}
                            onPress={() => {
                                setCurrency(cur);
                                setShowCurrencyPicker(false);
                            }}
                        >
                            <Text style={styles.modalOptionText}>{cur}</Text>
                        </TouchableOpacity>
                    ))}
                </ModalDialog>
            </DocsSection>

            <DocsSection title="Points Conversion">
                <Text style={styles.label}>Points per 1 unit of currency</Text>

                <Pressable
                    onPress={() => {
                        if (!requireParent()) return;
                    }}
                >
                    <TextInput
                        value={pointsRate}
                        onChangeText={onChangeRate}
                        editable={hasParentPermissions}
                        keyboardType="numeric"
                        placeholder="e.g. 10"
                        style={!hasParentPermissions && styles.disabledInput}
                        pointerEvents={hasParentPermissions ? "auto" : "none"}
                    />
                </Pressable>


                <Text style={[docsPageStyles.note, { marginTop: 6 }]}>
                    Whole numbers only — must be 1 or higher.
                </Text>
            </DocsSection>

            <DocsSection title="Self-Fulfilled Wishes">
                <Text style={styles.label}>
                    Max price a child can fulfill on their own
                </Text>

                <Pressable
                    onPress={() => {
                        if (!requireParent()) return;
                    }}
                >
                    <TextInput
                        value={selfFulfillMaxPrice}
                        onChangeText={(txt) => {
                            let cleaned = txt.replace(/[^0-9.]/g, "");
                            const parts = cleaned.split(".");
                            if (parts.length > 2) {
                                cleaned = parts[0] + "." + parts.slice(1).join("");
                            }
                            setSelfFulfillMaxPrice(cleaned);
                        }}
                        editable={hasParentPermissions}
                        keyboardType="numeric"
                        placeholder="e.g. 60 (leave empty for no limit)"
                        style={!hasParentPermissions && styles.disabledInput}
                        pointerEvents={hasParentPermissions ? "auto" : "none"}
                    />
                </Pressable>

                <Text style={docsPageStyles.note}>
                    This controls when kids can use “I can get this myself”.
                </Text>
            </DocsSection>


            {hasParentPermissions && (
                <Button
                    title={updateSettings.isPending ? "Saving…" : "Save Settings"}
                    type="primary"
                    size="lg"
                    fullWidth
                    showShadow
                    disabled={updateSettings.isPending}
                    onPress={onSave}
                />
            )}


        </DocsPageLayout>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 4 },
    dropdownBox: { justifyContent: "center" },
    dropdownText: { fontSize: 14, color: "#0f172a" },
    disabledInput: { opacity: 0.5 },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#fff",
        fontSize: 14,
    },
    modalOption: { paddingVertical: 14, paddingHorizontal: 20 },
    modalOptionText: { fontSize: 16, color: "#0f172a" },
});
