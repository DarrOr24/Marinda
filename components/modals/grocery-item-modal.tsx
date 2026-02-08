import { Button } from "@/components/ui/button";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
    visible: boolean;
    mode: "add" | "edit";

    name: string;
    onChangeName: (v: string) => void;

    category?: string;
    onChangeCategory: (v: string | undefined) => void;

    amount: string;
    onChangeAmount: (v: string) => void;

    categoryOpen: boolean;
    onToggleCategoryOpen: () => void;

    onCancel: () => void;
    onSubmit: () => void;
};

const DEFAULT_CATEGORIES = [
    "Produce",
    "Dairy & Eggs",
    "Bakery",
    "Pantry",
    "Meat & Seafood",
    "Frozen",
    "Beverages",
    "Household",
    "Personal Care",
    "Other",
];

export function GroceryItemModal({
    visible,
    mode,
    name,
    onChangeName,
    category,
    onChangeCategory,
    amount,
    onChangeAmount,
    categoryOpen,
    onToggleCategoryOpen,
    onCancel,
    onSubmit,
}: Props) {
    const title = mode === "edit" ? "Edit Grocery Item" : "Add Grocery Item";
    const submitLabel = mode === "edit" ? "Save" : "Add";

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>{title}</Text>

                    <Text style={styles.label}>Item</Text>
                    <TextInput
                        value={name}
                        onChangeText={onChangeName}
                        placeholder="e.g., Bananas"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                        autoFocus
                    />

                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity onPress={onToggleCategoryOpen} style={styles.select} activeOpacity={0.8}>
                        <Text style={styles.selectText}>{category ?? "Select a category"}</Text>
                        <MaterialCommunityIcons name="menu-down" size={22} color="#334155" />
                    </TouchableOpacity>

                    {categoryOpen && (
                        <View style={styles.menu}>
                            <Pressable
                                onPress={() => onChangeCategory(undefined)}
                                style={styles.menuItem}
                            >
                                <Text style={styles.menuItemText}>— None —</Text>
                            </Pressable>

                            {DEFAULT_CATEGORIES.map(c => (
                                <Pressable
                                    key={c}
                                    onPress={() => onChangeCategory(c)}
                                    style={styles.menuItem}
                                >
                                    <Text style={styles.menuItemText}>{c}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    <Text style={styles.label}>Amount (optional)</Text>
                    <TextInput
                        value={amount}
                        onChangeText={onChangeAmount}
                        placeholder="e.g., 2, 3 packs, 1kg"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                    />

                    <View style={styles.actions}>
                        <Button type="outline" size="sm" title="Cancel" onPress={onCancel} />
                        <Button type="primary" size="sm" title={submitLabel} onPress={onSubmit} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
    },
    card: {
        width: "100%",
        maxWidth: 460,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    title: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
    label: { fontSize: 12, color: "#475569", marginTop: 8, marginBottom: 4 },

    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: "#0f172a",
    },

    select: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    selectText: { color: "#0f172a", fontSize: 16 },

    menu: {
        marginTop: 6,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        backgroundColor: "#fff",
        overflow: "hidden",
    },
    menuItem: { paddingHorizontal: 12, paddingVertical: 10 },
    menuItemText: { color: "#0f172a", fontSize: 16 },

    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 16,
    },
});
