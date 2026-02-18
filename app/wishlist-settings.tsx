// app/wishlist-settings.tsx
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

import { Button, Screen } from "@/components/ui";
import { useAuthContext } from "@/hooks/use-auth-context";
import type { Role } from "@/lib/members/members.types";
import {
    useFamilyWishlistSettings,
    useUpdateWishlistSettings,
} from "@/lib/wishlist/wishlist-settings.hooks";

const CURRENCIES = ["CAD", "USD", "EUR", "GBP", "ILS"];

export default function WishlistSettingsScreen() {
    const { activeFamilyId, member } = useAuthContext() as any;

    const currentRole = (member?.role as Role) ?? "TEEN";
    const isParent = currentRole === "MOM" || currentRole === "DAD";

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

    const blockIfNotParent = () => {
        if (!isParent) {
            Alert.alert("Parents only", "Only parents can change wishlist settings.");
            return true;
        }
        return false;
    };

    const onSave = () => {
        if (blockIfNotParent()) return;
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
            <Screen gap="md" withBackground={false}>
                <View style={styles.center}>
                    <Text>Loading wishlist settings…</Text>
                </View>
            </Screen>
        );
    }

    if (isError) {
        return (
            <Screen gap="md" withBackground={false}>
                <View style={styles.center}>
                    <Text>Failed to load wishlist settings.</Text>
                </View>
            </Screen>
        );
    }


    return (
        <Screen gap="md" withBackground={false}>

            <Text style={styles.intro}>
                Parents can configure the currency and conversion rate for wish list items.
            </Text>

            {/* Currency Section */}
            <Section title="Currency">
                <Text style={styles.label}>Currency Type</Text>

                <Pressable
                    onPress={() => {
                        if (!isParent) return blockIfNotParent();
                        setShowCurrencyPicker(true);
                    }}
                    style={[styles.input, styles.dropdownBox, !isParent && styles.disabledInput]}
                >
                    <Text style={styles.dropdownText}>{currency}</Text>
                </Pressable>

                {/* Modal */}
                <Modal
                    visible={showCurrencyPicker}
                    transparent
                    animationType="fade"
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setShowCurrencyPicker(false)}
                    >
                        <View style={styles.modalSheet}>
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
                        </View>
                    </Pressable>
                </Modal>
            </Section>

            {/* Points Section */}
            <Section title="Points Conversion">
                <Text style={styles.label}>Points per 1 unit of currency</Text>

                <Pressable
                    onPress={() => {
                        if (!isParent) {
                            Alert.alert("Parents only", "Only parents can change wishlist settings.");
                        }
                    }}
                >
                    <TextInput
                        value={pointsRate}
                        // onChangeText={setPointsRate}
                        onChangeText={onChangeRate}
                        editable={isParent}
                        keyboardType="numeric"
                        style={[styles.input, !isParent && styles.disabledInput]}
                        placeholder="e.g. 10"
                        placeholderTextColor="#94a3b8"
                        pointerEvents={isParent ? "auto" : "none"} // prevents typing
                    />
                </Pressable>


                <Text style={styles.note}>
                    Whole numbers only — must be 1 or higher.
                </Text>
            </Section>

            {/* Self-fulfill limit (UI only for now — we will wire saving in Patch 4) */}
            <Section title="Self-Fulfilled Wishes">
                <Text style={styles.label}>
                    Max price a child can fulfill on their own
                </Text>

                <Pressable
                    onPress={() => {
                        if (!isParent) {
                            Alert.alert("Parents only", "Only parents can change wishlist settings.");
                        }
                    }}
                >
                    <TextInput
                        value={selfFulfillMaxPrice}
                        onChangeText={(txt) => {
                            // allow empty or digits + one dot
                            let cleaned = txt.replace(/[^0-9.]/g, "");
                            const parts = cleaned.split(".");
                            if (parts.length > 2) {
                                cleaned = parts[0] + "." + parts.slice(1).join("");
                            }
                            setSelfFulfillMaxPrice(cleaned);
                        }}
                        editable={isParent}
                        keyboardType="numeric"
                        placeholder="e.g. 60 (leave empty for no limit)"
                        placeholderTextColor="#94a3b8"
                        style={[styles.input, !isParent && styles.disabledInput]}
                        pointerEvents={isParent ? "auto" : "none"}
                    />
                </Pressable>

                <Text style={styles.note}>
                    This controls when kids can use “I can get this myself”.
                </Text>
            </Section>


            {isParent && (
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


            <View style={{ height: 60 }} />
            {/* Extra padding so Samsung navbar never covers content */}
        </Screen>

    );
}

function Section({ title, children }: any) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({

    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    intro: { fontSize: 14, color: "#475569", marginBottom: 20 },

    section: { marginBottom: 22 },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 6 },
    label: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 4 },

    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#fff",
        fontSize: 14,
    },
    disabledInput: { opacity: 0.5 },

    dropdownBox: { justifyContent: "center" },
    dropdownText: { fontSize: 14, color: "#0f172a" },

    note: { marginTop: 6, fontSize: 12, color: "#64748b" },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        backgroundColor: "#fff",
        paddingVertical: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    modalOption: { paddingVertical: 14, paddingHorizontal: 20 },
    modalOptionText: { fontSize: 16, color: "#0f172a" },
});
