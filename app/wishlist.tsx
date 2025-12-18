// app/wishlist.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity, // ✅ for dismiss
    TouchableWithoutFeedback,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthContext } from "@/hooks/use-auth-context";
import { useFamily } from "@/lib/families/families.hooks";
import { useSubscribeTableByFamily } from "@/lib/families/families.realtime";
import type { Role } from "@/lib/families/families.types";
import type { WishlistItem } from "@/lib/wishlist/wishlist.types";

import { KidSwitcher } from "@/components/kid-switcher";
import MediaPicker from '@/components/media-picker';
import { useFamilyWishlistSettings } from "@/lib/wishlist/wishlist-settings.hooks";
import {
    useAddWishlistItem,
    useDeleteWishlistItem,
    useMarkWishlistPurchased,
    useUpdateWishlistItem,
    useWishlist,
} from "@/lib/wishlist/wishlist.hooks";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Linking } from 'react-native';


export default function WishList() {
    const { activeFamilyId, member } = useAuthContext() as any;
    const currentRole = (member?.role as Role) ?? "TEEN";
    const isParent = currentRole === "MOM" || currentRole === "DAD";
    const { data: wishlistSettings } = useFamilyWishlistSettings(activeFamilyId);
    const POINTS_PER_CURRENCY = wishlistSettings?.points_per_currency ?? 10;
    const FAMILY_CURRENCY = wishlistSettings?.currency ?? "CAD";

    const router = useRouter();

    const { members } = useFamily(activeFamilyId || undefined);

    useSubscribeTableByFamily("wishlist_items", activeFamilyId || undefined, [
        "wishlist",
        activeFamilyId,
    ]);

    const {
        data: wishlist = [],
        isLoading: wishlistLoading,
        isError: wishlistError,
    } = useWishlist(activeFamilyId || undefined);

    const addItem = useAddWishlistItem(activeFamilyId || undefined);
    const deleteItem = useDeleteWishlistItem(activeFamilyId || undefined);
    const markPurchased = useMarkWishlistPurchased(activeFamilyId || undefined);
    const updateWishlistItem = useUpdateWishlistItem(activeFamilyId || undefined);

    // -------- member selection logic (for parents) --------
    const memberList = members.data ?? [];
    const kids = memberList.filter(
        (m: any) => m.role === "CHILD" || m.role === "TEEN"
    );

    const [selectedKidId, setSelectedKidId] = useState<string | null>(null);

    const effectiveMemberId: string | undefined = isParent
        ? selectedKidId ?? kids[0]?.id
        : (member as any)?.id;

    const viewingMember = memberList.find((m: any) => m.id === effectiveMemberId);
    // =============================
    // ⚡ BIDIRECTIONAL CALCULATOR
    // =============================

    const [calcCad, setCalcCad] = useState(""); // already existed
    const [calcPointsStr, setCalcPointsStr] = useState(""); // NEW
    const [calcLock, setCalcLock] = useState<"cad" | "points" | null>(null);

    // fulfillment intent (NEW)
    const [canFulfillSelf, setCanFulfillSelf] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState("")


    // CAD → Points
    const calcPoints = useMemo(() => {
        const cad = parseFloat(calcCad);
        if (!calcCad.trim() || Number.isNaN(cad)) return 0;
        return Math.round(cad * POINTS_PER_CURRENCY);
    }, [calcCad]);

    // Points → CAD
    const calcCadFromPoints = useMemo(() => {
        const pts = parseFloat(calcPointsStr);
        if (!calcPointsStr.trim() || Number.isNaN(pts)) return "";
        return (pts / POINTS_PER_CURRENCY).toFixed(2);
    }, [calcPointsStr]);

    // Sync when editing CAD
    useEffect(() => {
        if (calcLock === "cad") {
            if (!calcCad.trim()) setCalcPointsStr("");
            else setCalcPointsStr(String(calcPoints));
        }
    }, [calcCad]);

    // Sync when editing Points
    useEffect(() => {
        if (calcLock === "points") {
            if (!calcPointsStr.trim()) setCalcCad("");
            else setCalcCad(calcCadFromPoints);
        }
    }, [calcPointsStr]);

    // -------- tabs --------
    const [tab, setTab] = useState<"wishes" | "fulfilled">("wishes");

    // filter wishlist by member + tab
    const itemsForMember = wishlist.filter(
        (w) => w.member_id === effectiveMemberId
    );

    const wishes = itemsForMember.filter((w) => w.status === "open");
    const fulfilled = itemsForMember.filter((w) => w.status === "fulfilled");

    // -------- add/edit modal --------
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newNote, setNewNote] = useState("");
    const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
    const [newLink, setNewLink] = useState("");
    const [newImageUri, setNewImageUri] = useState<string | null>(null);

    const previewPoints = useMemo(() => {
        const val = parseFloat(newPrice);
        if (!newPrice.trim() || Number.isNaN(val)) return 0;
        return Math.round(val * POINTS_PER_CURRENCY);
    }, [newPrice]);

    const canAdd =
        !isParent && !!activeFamilyId && !!effectiveMemberId && !addItem.isPending;

    const handleSave = () => {
        const trimmedTitle = newTitle.trim();
        if (!trimmedTitle) return;

        if (editingItem) {
            updateWishlistItem.mutate(
                {
                    itemId: editingItem.id,
                    fields: {
                        title: trimmedTitle,
                        price: parseFloat(newPrice) || null,
                        note: newNote.trim() || null,
                        link: newLink.trim() || null,
                        imageUri: newImageUri || null,
                        fulfillment_mode: canFulfillSelf ? "self" : "parents",
                        payment_method: canFulfillSelf ? paymentMethod.trim() || null : null,
                    },
                },
                { onSuccess: () => setEditingItem(null) }
            );
        } else {
            addItem.mutate({
                familyId: activeFamilyId!,
                memberId: effectiveMemberId!,
                title: trimmedTitle,
                price: parseFloat(newPrice) || null,
                link: newLink.trim() || null,
                note: newNote.trim() || null,
                imageUri: newImageUri || null,

                fulfillmentMode: canFulfillSelf ? "self" : "parents",
                paymentMethod: canFulfillSelf ? paymentMethod.trim() || null : null,
            });

        }

        setShowAddModal(false);
        resetForm();
    };

    // -------- loading/error --------
    if (!activeFamilyId) {
        return (
            <SafeAreaView style={styles.centerScreen}>
                <Text style={styles.muted}>No family selected yet</Text>
            </SafeAreaView>
        );
    }

    if (members.isLoading || wishlistLoading) {
        return (
            <SafeAreaView style={styles.centerScreen}>
                <ActivityIndicator />
                <Text style={styles.muted}>Loading wish list…</Text>
            </SafeAreaView>
        );
    }

    if (members.isError || wishlistError) {
        return (
            <SafeAreaView style={styles.centerScreen}>
                <Text style={styles.muted}>Failed to load wish list.</Text>
            </SafeAreaView>
        );
    }

    // Reset all modal fields
    function resetForm() {
        setNewTitle("");
        setNewPrice("");
        setNewNote("");
        setNewLink("");
        setNewImageUri(null);
        setEditingItem(null);
        setCanFulfillSelf(false)
        setPaymentMethod("")
    }

    return (
        <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                {/* ===== TOP SECTION (2 ROWS) ===== */}
                <View style={styles.headerBlock}>

                    {/* ROW 1 — Title + Icons */}
                    <View style={styles.row1}>
                        <Text style={styles.title}>
                            {isParent
                                ? `${viewingMember?.profile?.first_name || "Child"}'s Wish List`
                                : "My Wish List"}
                        </Text>

                        <View style={styles.iconsRow}>
                            <Pressable onPress={() => router.push('/wishlist-info')}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={22}
                                    color="#334155"
                                />
                            </Pressable>

                            <Pressable onPress={() => router.push("/wishlist-settings")}>
                                <Ionicons
                                    name="settings-outline"
                                    size={22}
                                    color="#334155"
                                />
                            </Pressable>
                        </View>
                    </View>

                    {/* ROW 2 — Points + Switcher (LEFT only) */}
                    <View style={styles.row2}>
                        <View style={styles.pointsAndSwitcher}>
                            <Text style={styles.pointsValue}>
                                {viewingMember ? `${viewingMember.points} pts` : ""}
                            </Text>

                            {isParent && (
                                <KidSwitcher
                                    kids={kids}
                                    selectedKidId={selectedKidId}
                                    onSelectKid={setSelectedKidId}
                                />
                            )}
                        </View>
                    </View>

                </View>

                {/* =======================
                     BIDIRECTIONAL CALCULATOR
                    ======================= */}
                <View style={{ gap: 6 }}>
                    <View style={styles.calcRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.calcLabel}>{FAMILY_CURRENCY}</Text>
                            <TextInput
                                placeholder="0"
                                keyboardType="numeric"
                                value={calcCad}
                                onChangeText={(v) => {
                                    setCalcLock("cad");
                                    setCalcCad(v);
                                }}
                                onBlur={() => setCalcLock(null)}
                                style={styles.calcInput}
                            />
                        </View>

                        <Text style={styles.arrow}>↔</Text>

                        <View style={{ flex: 1 }}>
                            <Text style={styles.calcLabel}>Points</Text>
                            <TextInput
                                placeholder="0"
                                keyboardType="numeric"
                                value={calcPointsStr}
                                onChangeText={(v) => {
                                    setCalcLock("points");
                                    setCalcPointsStr(v);
                                }}
                                onBlur={() => setCalcLock(null)}
                                style={styles.calcInput}
                            />
                        </View>
                    </View>

                    <Text style={styles.rateText}>
                        {POINTS_PER_CURRENCY} points = $1 {FAMILY_CURRENCY}
                    </Text>

                </View>

                {/* Tabs */}
                <View style={styles.tabsRow}>
                    <Pressable
                        style={[styles.tab, tab === "wishes" && styles.tabActive]}
                        onPress={() => setTab("wishes")}
                    >
                        <Text
                            style={[styles.tabText, tab === "wishes" && styles.tabTextActive]}
                        >
                            Wishes
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tab, tab === "fulfilled" && styles.tabActive]}
                        onPress={() => setTab("fulfilled")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                tab === "fulfilled" && styles.tabTextActive,
                            ]}
                        >
                            Fulfilled
                        </Text>
                    </Pressable>
                </View>

                {/* List */}
                {(tab === "wishes" ? wishes : fulfilled).map((item) => {
                    const pts =
                        item.price != null
                            ? Math.round(item.price * POINTS_PER_CURRENCY)
                            : null;

                    const canFulfill =
                        item.status === "open" &&
                        (isParent || item.fulfillment_mode === "self");

                    return (
                        <View key={item.id} style={styles.cardRow}>
                            {/* IMAGE LEFT */}
                            {item.image_url && (
                                <Image
                                    source={{ uri: item.image_url }}
                                    style={styles.cardThumb}
                                />
                            )}

                            {/* RIGHT SIDE CONTENT */}
                            <View style={styles.cardRight}>
                                <Text style={styles.cardTitle}>{item.title}</Text>

                                {item.price != null && (
                                    <Text style={styles.cardSubtitle}>
                                        ${item.price.toFixed(2)} · {Math.round(item.price * POINTS_PER_CURRENCY)} pts
                                    </Text>
                                )}

                                {item.note && (
                                    <Text style={styles.cardNote} numberOfLines={2}>
                                        {item.note}
                                    </Text>
                                )}

                                {/* ADDED DATE */}
                                {item.created_at && (
                                    <Text style={styles.cardDate}>
                                        Added {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                )}

                                {/* LINK */}
                                {item.link && (
                                    <Text
                                        style={styles.cardLink}
                                        numberOfLines={1}
                                        onPress={() => {
                                            const url = item.link!.startsWith('http')
                                                ? item.link!
                                                : `https://${item.link!}`;
                                            Linking.openURL(url);
                                        }}
                                    >
                                        {item.link}
                                    </Text>
                                )}

                                {/* ACTIONS */}
                                <View style={styles.cardActionsRow}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setEditingItem(item);
                                            setNewTitle(item.title);
                                            setNewPrice(item.price?.toString() || "");
                                            setNewNote(item.note || "");
                                            setNewLink(item.link || "");
                                            setNewImageUri(item.image_url || null);
                                            setShowAddModal(true);
                                        }}
                                    >
                                        <Text style={styles.actionPrimary}>Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() =>
                                            Alert.alert(
                                                "Delete wish?",
                                                "Are you sure you want to delete this wish?",
                                                [
                                                    { text: "Cancel", style: "cancel" },
                                                    {
                                                        text: "Delete",
                                                        style: "destructive",
                                                        onPress: () => deleteItem.mutate(item.id),
                                                    },
                                                ]
                                            )
                                        }
                                    >
                                        <Text style={styles.actionDanger}>Delete</Text>
                                    </TouchableOpacity>

                                    {canFulfill && (
                                        <TouchableOpacity onPress={() => markPurchased.mutate(item.id)}>
                                            <Text style={styles.actionPrimary}>Mark fulfilled</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>

                    );
                })}

                {itemsForMember.length === 0 && (
                    <Text style={styles.emptyText}>
                        No wishes yet.{" "}
                        {isParent
                            ? "Ask them to add one!"
                            : "Tap + to add your first wish."}
                    </Text>
                )}
            </ScrollView>

            {/* FAB – kids only */}
            {!isParent && (
                <TouchableOpacity
                    style={[styles.fab, !canAdd && { opacity: 0.5 }]}
                    onPress={() => {
                        resetForm();
                        setShowAddModal(true);
                    }}

                    disabled={!canAdd}
                >
                    <MaterialCommunityIcons name="plus" size={26} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Add/Edit Modal */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        setShowAddModal(false);
                        resetForm();
                    }}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalBox}>
                            <Text style={styles.modalTitle}>
                                {editingItem ? "Edit Wish" : "Add Wish"}
                            </Text>

                            <TextInput
                                placeholder="Title"
                                value={newTitle}
                                onChangeText={setNewTitle}
                                style={styles.input}
                            />
                            <TextInput
                                placeholder={`Price (${FAMILY_CURRENCY})`}
                                keyboardType="numeric"
                                value={newPrice}
                                onChangeText={setNewPrice}
                                style={styles.input}
                            />
                            <Text style={styles.previewText}>
                                ≈ {previewPoints} points ({POINTS_PER_CURRENCY} pts = $1)
                            </Text>

                            <Pressable
                                style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
                                onPress={() => setCanFulfillSelf(v => !v)}
                            >
                                <MaterialCommunityIcons
                                    name={canFulfillSelf ? "checkbox-marked" : "checkbox-blank-outline"}
                                    size={22}
                                    color="#2563eb"
                                />
                                <Text style={{ marginLeft: 8 }}>
                                    I can get this myself
                                </Text>
                            </Pressable>
                            {canFulfillSelf && (
                                <TextInput
                                    placeholder="How will I pay? (optional)"
                                    value={paymentMethod}
                                    onChangeText={setPaymentMethod}
                                    style={styles.input}
                                />
                            )}

                            <TextInput
                                placeholder="Note (optional)"
                                value={newNote}
                                onChangeText={setNewNote}
                                style={[styles.input, { minHeight: 60 }]}
                                multiline
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                submitBehavior="submit"
                            />
                            {/* LINK INPUT */}
                            <TextInput
                                placeholder="Link (optional)"
                                value={newLink}
                                onChangeText={setNewLink}
                                style={styles.input}
                            />

                            <MediaPicker
                                label="Image"
                                value={
                                    newImageUri
                                        ? { uri: newImageUri, kind: "image" }
                                        : null
                                }
                                onChange={(media) => {
                                    setNewImageUri(media?.uri ?? null);
                                }}
                                allowImage
                                allowVideo={false}
                                pickFromLibrary={true}
                            />

                            <View style={styles.modalButtonsRow}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalCancel]}
                                    onPress={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalSave]}
                                    onPress={handleSave}
                                >
                                    <Text style={styles.modalSaveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

/* ----------------- styles ----------------- */

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    centerScreen: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
    },
    muted: {
        color: "#64748b",
        fontSize: 14,
        marginTop: 8,
    },
    container: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
        gap: 16,
    },
    pointsAndSwitcher: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    headerBlock: {
        gap: 4,
    },

    row1: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    row2: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 2,
    },

    pointsValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1e3a8a",
    },

    iconsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0f172a",
    },
    calcRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    calcInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: "#ffffff",
    },
    calcLabel: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 4,
        marginLeft: 2,
    },

    arrow: {
        fontSize: 18,
        color: "#475569",
    },
    rateText: {
        marginTop: 6,
        fontSize: 12,
        color: "#64748b",
    },

    tabsRow: {
        flexDirection: "row",
        backgroundColor: "#e2e8f0",
        borderRadius: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
    },
    tabActive: {
        backgroundColor: "#2563eb",
    },
    tabText: {
        fontSize: 14,
        color: "#334155",
        fontWeight: "500",
    },
    tabTextActive: {
        color: "#ffffff",
        fontWeight: "600",
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#475569",
        marginBottom: 4,
    },
    cardNote: {
        fontSize: 13,
        color: "#6b7280",
    },
    actionPrimary: {
        fontSize: 13,
        fontWeight: "600",
        color: "#2563eb",
    },
    actionDanger: {
        fontSize: 13,
        fontWeight: "600",
        color: "#dc2626",
    },

    emptyText: {
        marginTop: 8,
        fontSize: 13,
        color: "#94a3b8",
    },

    fab: {
        position: "absolute",
        right: 20,
        bottom: 28,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#2563eb",
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
    },

    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.25)",
    },
    modalBox: {
        padding: 20,
        borderRadius: 16,
        backgroundColor: "#ffffff",
        elevation: 8,
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
    modalButton: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
    },
    modalCancel: {
        backgroundColor: "#e5e7eb",
    },
    modalCancelText: {
        color: "#111827",
        fontWeight: "600",
    },
    modalSave: {
        backgroundColor: "#2563eb",
    },
    modalSaveText: {
        color: "#ffffff",
        fontWeight: "700",
    },

    cardLink: {
        fontSize: 13,
        color: "#2563eb",
        marginTop: 4,
        textDecorationLine: "underline",
    },
    cardRow: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 16,
        padding: 12,
        backgroundColor: "#fff",
        elevation: 2,
        gap: 12,
    },

    cardThumb: {
        width: 90,
        aspectRatio: 0.75,
        borderRadius: 8,
        backgroundColor: "#f8f8f8",
        resizeMode: "contain",
    },

    cardRight: {
        flex: 1,
        justifyContent: "space-between",
        gap: 4,
    },

    cardDate: {
        fontSize: 11,
        color: "#9ca3af",
    },

    cardActionsRow: {
        flexDirection: "row",
        marginTop: 6,
        gap: 16,
    },

});
