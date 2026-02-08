import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
    Alert,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import MediaPicker from "@/components/media-picker";
import { Button } from "@/components/ui/button";
import { ModalCard } from "@/components/ui/modal-card";
import { ModalShell } from "@/components/ui/modal-shell";

type Props = {
    visible: boolean;
    mode: "add" | "edit";

    currency: string;
    pointsPerCurrency: number;
    selfFulfillMaxPrice: number | null;

    title: string;
    onChangeTitle: (v: string) => void;

    price: string;
    onChangePrice: (v: string) => void;

    note: string;
    onChangeNote: (v: string) => void;

    link: string;
    onChangeLink: (v: string) => void;

    imageUri: string | null;
    onChangeImageUri: (v: string | null) => void;

    canFulfillSelf: boolean;
    onChangeCanFulfillSelf: (next: boolean) => void;

    paymentMethod: string;
    onChangePaymentMethod: (v: string) => void;

    previewPoints: number;
    exceedsSelfFulfillLimit: boolean;

    onClose: () => void;
    onSubmit: () => void;
};

export function WishlistItemModal({
    visible,
    mode,

    currency,
    pointsPerCurrency,
    selfFulfillMaxPrice,

    title,
    onChangeTitle,

    price,
    onChangePrice,

    note,
    onChangeNote,

    link,
    onChangeLink,

    imageUri,
    onChangeImageUri,

    canFulfillSelf,
    onChangeCanFulfillSelf,

    paymentMethod,
    onChangePaymentMethod,

    previewPoints,
    exceedsSelfFulfillLimit,

    onClose,
    onSubmit,
}: Props) {
    function handleToggleSelfFulfill() {
        // must have a price first
        if (!price.trim()) {
            Alert.alert(
                "Price required",
                "Please enter a price before choosing to fulfill this wish yourself."
            );
            return;
        }

        // if price isn't a number, show error (so we don't silently do nothing)
        const n = Number(price);
        if (Number.isNaN(n)) {
            Alert.alert("Invalid price", "Please enter a valid number.");
            return;
        }

        // enforcing limit only when user is turning ON self-fulfill
        if (!canFulfillSelf && exceedsSelfFulfillLimit) {
            Alert.alert(
                "Price too high",
                `You can only fulfill wishes up to ${currency} ${selfFulfillMaxPrice ?? ""} on your own.`
            );
            return;
        }

        onChangeCanFulfillSelf(!canFulfillSelf);
    }

    useEffect(() => {
        if (!canFulfillSelf) return;
        if (!price.trim()) return;
        if (selfFulfillMaxPrice == null) return;

        const n = Number(price);
        if (Number.isNaN(n)) return;

        if (n > selfFulfillMaxPrice) {
            Alert.alert(
                "Price too high",
                `This wish exceeds the self-fulfill limit of ${currency} ${selfFulfillMaxPrice}.`
            );
            onChangeCanFulfillSelf(false);
        }
    }, [price, canFulfillSelf, selfFulfillMaxPrice, currency, onChangeCanFulfillSelf]);


    return (
        <ModalShell visible={visible} onClose={onClose} keyboardOffset={40}>
            <ModalCard bottomPadding={12} maxHeightPadding={24} style={styles.card}>
                <Text style={styles.modalTitle}>{mode === "edit" ? "Edit Wish" : "Add Wish"}</Text>

                <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={{ paddingBottom: 12 }}
                >
                    <TextInput
                        placeholder="Title"
                        placeholderTextColor="#94a3b8"
                        value={title}
                        onChangeText={onChangeTitle}
                        style={styles.input}
                        returnKeyType="done"
                        submitBehavior="submit"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />

                    <TextInput
                        placeholder={`Price (${currency})`}
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={price}
                        onChangeText={onChangePrice}
                        style={styles.input}
                        returnKeyType="done"
                        submitBehavior="submit"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />

                    <Text style={styles.previewText}>
                        ≈ {previewPoints} points ({pointsPerCurrency} pts = $1)
                    </Text>

                    <Pressable
                        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
                        onPress={handleToggleSelfFulfill}
                    >
                        <MaterialCommunityIcons
                            name={canFulfillSelf ? "checkbox-marked" : "checkbox-blank-outline"}
                            size={22}
                            color="#2563eb"
                        />
                        <Text style={{ marginLeft: 8 }}>
                            I can get this myself
                            {selfFulfillMaxPrice != null && (
                                <Text style={{ color: "#64748b" }}>
                                    {" "}
                                    (up to {currency} {selfFulfillMaxPrice})
                                </Text>
                            )}
                        </Text>
                    </Pressable>

                    {canFulfillSelf && (
                        <TextInput
                            placeholder="How will I pay? (optional)"
                            placeholderTextColor="#94a3b8"
                            value={paymentMethod}
                            onChangeText={onChangePaymentMethod}
                            style={styles.input}
                            returnKeyType="done"
                            submitBehavior="submit"
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                    )}

                    <TextInput
                        placeholder="Note (optional)"
                        placeholderTextColor="#94a3b8"
                        value={note}
                        onChangeText={onChangeNote}
                        style={[styles.input, { minHeight: 60 }]}
                        multiline
                        returnKeyType="done"
                        submitBehavior="submit"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />

                    <TextInput
                        placeholder="Link (optional)"
                        placeholderTextColor="#94a3b8"
                        value={link}
                        onChangeText={onChangeLink}
                        style={styles.input}
                        returnKeyType="done"
                        submitBehavior="submit"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />

                    <MediaPicker
                        label="Image"
                        value={imageUri ? { uri: imageUri, kind: "image" } : null}
                        onChange={(media) => onChangeImageUri(media?.uri ?? null)}
                        allowImage
                        allowVideo={false}
                        pickFromLibrary={true}
                    />
                </ScrollView>

                <View style={styles.modalButtonsRow}>
                    <Button type="outline" size="sm" title="Cancel" onPress={onClose} />
                    <Button type="primary" size="sm" title="Save" onPress={onSubmit} />
                </View>
            </ModalCard>
        </ModalShell>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 10,
        backgroundColor: "#ffffff",
    },
    previewText: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 8,
    },
    modalButtonsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 8,
    },
});

