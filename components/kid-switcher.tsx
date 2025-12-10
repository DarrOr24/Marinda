// components/kid-switcher.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";

import { ProfileAvatar } from "@/components/avatar/profile-avatar";
import type { Member } from "@/lib/families/families.types";

type KidSwitcherProps = {
    kids: Member[];
    selectedKidId: string | null;
    onSelectKid: (kidId: string) => void;
};

export function KidSwitcher({ kids, selectedKidId, onSelectKid }: KidSwitcherProps) {
    const [open, setOpen] = useState(false);

    const activeKid =
        kids.find((k) => k.id === selectedKidId) || kids[0] || null;

    return (
        <View
            style={{
                position: "relative",
                overflow: "visible",
            }}
        >
            {/* SWITCH BUTTON */}
            <Pressable style={styles.button} onPress={() => setOpen((p) => !p)}>
                <MaterialCommunityIcons
                    name="account-switch"
                    size={18}
                    color="#334155"
                />
                <Text style={styles.buttonText}>
                    {activeKid?.profile?.first_name || "Select"}
                </Text>
            </Pressable>

            {/* FLOATING DROPDOWN — EXACTLY LIKE BEFORE */}
            {open && (
                <View style={styles.dropdown}>
                    {kids.map((kid) => (
                        <Pressable
                            key={kid.id}
                            style={({ pressed }) => [
                                styles.option,
                                pressed && styles.optionPressed,
                            ]}
                            onPress={() => {
                                onSelectKid(kid.id);
                                setOpen(false);
                            }}
                        >
                            <View style={styles.row}>
                                <ProfileAvatar profileId={kid.profile_id} size="sm" />
                                <Text style={styles.optionText}>
                                    {kid.profile?.first_name}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#e5edff",
        gap: 4,
    },
    buttonText: {
        fontSize: 13,
        color: "#334155",
        fontWeight: "500",
    },

    /* ↓↓↓ THE MAGIC PART ↓↓↓ */
    dropdown: {
        position: "absolute",
        top: 38, // PERFECT spacing below the button
        left: 0,

        backgroundColor: "#ffffff",
        borderRadius: 12,
        paddingVertical: 4,

        minWidth: 160,

        zIndex: 9999,
        elevation: 10,

        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },

    option: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    optionPressed: {
        backgroundColor: "#eef2f7",
    },
    optionText: {
        fontSize: 15,
        color: "#111827",
        fontWeight: "500",
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
});
