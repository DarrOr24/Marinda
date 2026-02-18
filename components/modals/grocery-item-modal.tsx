import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { ModalCard, useModalScrollMaxHeight } from "@/components/ui/modal-card";
import { ModalShell } from "@/components/ui/modal-shell";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
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
    const scrollMaxHeight = useModalScrollMaxHeight(140);
    const title = mode === "edit" ? "Edit Grocery Item" : "Add Grocery Item";
    const submitLabel = mode === "edit" ? "Save" : "Add";

    return (
        <ModalShell visible={visible} onClose={onCancel} keyboardOffset={40}>
            <ModalCard style={styles.card} maxHeightPadding={24}>
                <Text style={styles.title}>{title}</Text>

                <ScrollView
                    style={{ maxHeight: scrollMaxHeight }}
                    contentContainerStyle={{ paddingBottom: 16, flexGrow: 0 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    <TextInput
                        label="Item"
                        value={name}
                        onChangeText={onChangeName}
                        placeholder="e.g., Bananas"
                        containerStyle={styles.label}
                        autoFocus
                    />

                    <Text style={styles.labelText}>Category</Text>
                    <TouchableOpacity
                        onPress={onToggleCategoryOpen}
                        style={styles.select}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.selectText}>
                            {category ?? "Select a category"}
                        </Text>
                        <MaterialCommunityIcons
                            name="menu-down"
                            size={22}
                            color="#334155"
                        />
                    </TouchableOpacity>

                    {categoryOpen && (
                        <View style={styles.menu}>
                            <Pressable
                                onPress={() => {
                                    onChangeCategory(undefined);
                                    onToggleCategoryOpen();
                                }}
                                style={styles.menuItem}
                            >
                                <Text style={styles.menuItemText}>— None —</Text>
                            </Pressable>


                            {DEFAULT_CATEGORIES.map((c) => (
                                <Pressable
                                    key={c}
                                    onPress={() => {
                                        onChangeCategory(c);
                                        onToggleCategoryOpen();
                                    }}

                                    style={styles.menuItem}
                                >
                                    <Text style={styles.menuItemText}>{c}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    <TextInput
                        label="Amount (optional)"
                        value={amount}
                        onChangeText={onChangeAmount}
                        placeholder="e.g., 2, 3 packs, 1kg"
                        containerStyle={styles.label}
                    />
                </ScrollView>

                <View style={styles.actions}>
                    <Button type="outline" size="sm" title="Cancel" onPress={onCancel} />
                    <Button type="primary" size="sm" title={submitLabel} onPress={onSubmit} />
                </View>
            </ModalCard>
        </ModalShell>
    );

}

const styles = StyleSheet.create({

    card: {
        width: "100%",
        maxWidth: 460,
    },

    title: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
    label: { marginTop: 8 },
    labelText: { fontSize: 12, color: "#475569", marginTop: 8, marginBottom: 4 },

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
