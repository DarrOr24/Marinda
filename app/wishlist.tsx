// app/wishlist.tsx
import { Screen } from "@/components/ui/screen";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";


import { useAuthContext } from "@/hooks/use-auth-context";
import { useFamily } from "@/lib/families/families.hooks";
import type { Role } from "@/lib/members/members.types";
import type { WishlistItem } from "@/lib/wishlist/wishlist.types";

import { KidSwitcher } from "@/components/kid-switcher";
import { Button } from "@/components/ui/button";

import { useFamilyWishlistSettings } from "@/lib/wishlist/wishlist-settings.hooks";
import {
    useAddWishlistItem,
    useDeleteWishlistItem,
    useMarkWishlistPurchased,
    useUpdateWishlistItem,
    useWishlist,
} from "@/lib/wishlist/wishlist.hooks";

// ✅ NEW UI helpers
import { WishlistItemModal } from "@/components/modals/wishlist-item-modal";
import { SafeFab } from "@/components/ui/safe-fab";

export default function WishList() {

    const { activeFamilyId, member } = useAuthContext() as any;

    const currentRole = (member?.role as Role) ?? "TEEN";
    const isParent = currentRole === "MOM" || currentRole === "DAD";

    const { data: wishlistSettings } = useFamilyWishlistSettings(activeFamilyId);
    const POINTS_PER_CURRENCY = wishlistSettings?.points_per_currency ?? 10;
    const FAMILY_CURRENCY = wishlistSettings?.currency ?? "CAD";
    const SELF_FULFILL_MAX_PRICE = wishlistSettings?.self_fulfill_max_price ?? null;

    const router = useRouter();

    const { familyMembers } = useFamily(activeFamilyId);

    const {
        data: wishlist = [],
        isLoading: wishlistLoading,
        isError: wishlistError,
    } = useWishlist(activeFamilyId);

    const addItem = useAddWishlistItem(activeFamilyId);
    const deleteItem = useDeleteWishlistItem(activeFamilyId);
    const markPurchased = useMarkWishlistPurchased(activeFamilyId);
    const updateWishlistItem = useUpdateWishlistItem(activeFamilyId);

    // -------- member selection logic (for parents) --------
    const memberList = familyMembers.data ?? [];
    const kids = memberList.filter((m: any) => m.role === "CHILD" || m.role === "TEEN");

    const findMemberByAnyId = (id?: string | null) => {
        if (!id) return undefined;

        return memberList.find(
            (m: any) =>
                m.id === id ||
                m.user_id === id ||
                m.profile?.id === id ||
                m.profile_id === id
        );
    };

    const nameForMemberId = (id?: string | null) => {
        const m = findMemberByAnyId(id);
        return m?.profile?.first_name || "Unknown";
    };

    const [selectedKidId, setSelectedKidId] = useState<string | null>(null);

    const effectiveMemberId: string | undefined = isParent
        ? selectedKidId ?? kids[0]?.id
        : (member as any)?.id;

    const viewingMember = findMemberByAnyId(effectiveMemberId);


    // =============================
    // ⚡ BIDIRECTIONAL CALCULATOR
    // =============================
    const [calcCad, setCalcCad] = useState("");
    const [calcPointsStr, setCalcPointsStr] = useState("");
    const [calcLock, setCalcLock] = useState<"cad" | "points" | null>(null);

    const [canFulfillSelf, setCanFulfillSelf] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("");

    const calcPoints = useMemo(() => {
        const cad = parseFloat(calcCad);
        if (!calcCad.trim() || Number.isNaN(cad)) return 0;
        return Math.round(cad * POINTS_PER_CURRENCY);
    }, [calcCad, POINTS_PER_CURRENCY]);

    const calcCadFromPoints = useMemo(() => {
        const pts = parseFloat(calcPointsStr);
        if (!calcPointsStr.trim() || Number.isNaN(pts)) return "";
        return (pts / POINTS_PER_CURRENCY).toFixed(2);
    }, [calcPointsStr, POINTS_PER_CURRENCY]);

    useEffect(() => {
        if (calcLock === "cad") {
            if (!calcCad.trim()) setCalcPointsStr("");
            else setCalcPointsStr(String(calcPoints));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calcCad]);

    useEffect(() => {
        if (calcLock === "points") {
            if (!calcPointsStr.trim()) setCalcCad("");
            else setCalcCad(calcCadFromPoints);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calcPointsStr]);

    // -------- tabs --------
    const [tab, setTab] = useState<"wishes" | "fulfilled">("wishes");

    const itemsForMember = wishlist.filter((w) => w.member_id === effectiveMemberId);
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
    }, [newPrice, POINTS_PER_CURRENCY]);

    const exceedsSelfFulfillLimit =
        SELF_FULFILL_MAX_PRICE != null && newPrice.trim() !== "" && Number(newPrice) > SELF_FULFILL_MAX_PRICE;

    function resetForm() {
        setNewTitle("");
        setNewPrice("");
        setNewNote("");
        setNewLink("");
        setNewImageUri(null);
        setEditingItem(null);
        setCanFulfillSelf(false);
        setPaymentMethod("");
    }

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
                {
                    onSuccess: () => {
                        console.log("[wishlist] update success");
                        setShowAddModal(false);
                        resetForm();
                    },
                    onError: (err: any) => {
                        console.log("[wishlist] update error", err);
                        Alert.alert(
                            "Failed to update wish",
                            err?.message || err?.toString?.() || "Unknown error"
                        );
                    },
                }
            );
            return;
        }

        addItem.mutate(
            {
                familyId: activeFamilyId!,
                memberId: effectiveMemberId!,
                title: trimmedTitle,
                price: parseFloat(newPrice) || null,
                link: newLink.trim() || null,
                note: newNote.trim() || null,
                imageUri: newImageUri || null,
                fulfillmentMode: canFulfillSelf ? "self" : "parents",
                paymentMethod: canFulfillSelf ? paymentMethod.trim() || null : null,
            },
            {
                onSuccess: (data) => {
                    console.log("[wishlist] add success", data);
                    setShowAddModal(false);
                    resetForm();
                },
                onError: (err: any) => {
                    console.log("[wishlist] add error", err);
                    Alert.alert(
                        "Failed to add wish",
                        err?.message || err?.toString?.() || "Unknown error"
                    );
                },
            }
        );
    };

    // -------- loading/error --------
    if (!activeFamilyId) {
        return (
            <Screen gap="md">
                <View style={styles.centerScreen}>
                    <Text style={styles.muted}>No family selected yet</Text>
                </View>
            </Screen>
        );
    }

    if (familyMembers.isLoading || wishlistLoading) {
        return (
            <Screen gap="md">
                <View style={styles.centerScreen}>
                    <ActivityIndicator />
                    <Text style={styles.muted}>Loading wish list…</Text>
                </View>
            </Screen>
        );
    }

    if (familyMembers.isError || wishlistError) {
        return (
            <Screen gap="md">
                <View style={styles.centerScreen}>
                    <Text style={styles.muted}>Failed to load wish list.</Text>
                </View>
            </Screen>
        );
    }

    return (
        <Screen
            bottomOffset={56}
            gap="md"
            overlay={
                <SafeFab bottomOffset={50} rightOffset={16}>
                    <Button
                        type="primary"
                        size="xl"
                        round
                        onPress={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        leftIcon={<MaterialCommunityIcons name="plus" size={26} />}
                    />
                </SafeFab>
            }
        >
            <View style={styles.container}>
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
                            <Button
                                type="outline"
                                size="sm"
                                round
                                hitSlop={8}
                                backgroundColor="#eef2ff"
                                onPress={() => router.push("/wishlist-info")}
                                leftIcon={<Ionicons name="information-circle-outline" size={20} />}
                            />

                            <Button
                                type="outline"
                                size="sm"
                                round
                                hitSlop={8}
                                backgroundColor="#eef2ff"
                                onPress={() => router.push("/wishlist-settings")}
                                leftIcon={<Ionicons name="settings-outline" size={20} />}
                            />
                        </View>
                    </View>

                    {/* ROW 2 — Points + Switcher */}
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
                                placeholderTextColor="#94a3b8"
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
                                placeholderTextColor="#94a3b8"
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
                        <Text style={[styles.tabText, tab === "wishes" && styles.tabTextActive]}>
                            Wishes
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[styles.tab, tab === "fulfilled" && styles.tabActive]}
                        onPress={() => setTab("fulfilled")}
                    >
                        <Text style={[styles.tabText, tab === "fulfilled" && styles.tabTextActive]}>
                            Fulfilled
                        </Text>
                    </Pressable>
                </View>

                {/* List */}
                {(tab === "wishes" ? wishes : fulfilled).map((item) => {
                    const canFulfill =
                        item.status === "open" && (isParent || item.fulfillment_mode === "self");

                    return (
                        <View key={item.id} style={styles.cardRow}>
                            {item.image_url && (
                                <Image source={{ uri: item.image_url }} style={styles.cardThumb} />
                            )}

                            <View style={styles.cardRight}>
                                <Text style={styles.cardTitle}>{item.title}</Text>

                                {item.price != null && (
                                    <Text style={styles.cardSubtitle}>
                                        ${item.price.toFixed(2)} ·{" "}
                                        {Math.round(item.price * POINTS_PER_CURRENCY)} pts
                                    </Text>
                                )}

                                {item.note && (
                                    <Text style={styles.cardNote} numberOfLines={2}>
                                        {item.note}
                                    </Text>
                                )}

                                {item.status === "fulfilled" && item.fulfilled_at && (
                                    <Text style={styles.cardDate}>
                                        {item.fulfillment_mode === "self"
                                            ? "Self-fulfilled"
                                            : item.fulfilled_by
                                                ? `Fulfilled by ${nameForMemberId(item.fulfilled_by)}`
                                                : "Fulfilled"}
                                        {" · "}
                                        {new Date(item.fulfilled_at).toLocaleDateString()}
                                    </Text>
                                )}

                                {item.created_at && (
                                    <Text style={styles.cardDate}>
                                        Added {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                )}

                                {item.link && (
                                    <Text
                                        style={styles.cardLink}
                                        numberOfLines={1}
                                        onPress={() => {
                                            const url = item.link!.startsWith("http")
                                                ? item.link!
                                                : `https://${item.link!}`;
                                            Linking.openURL(url);
                                        }}
                                    >
                                        {item.link}
                                    </Text>
                                )}

                                <View style={styles.cardActionsRow}>
                                    {item.status === "open" && (
                                        <>
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
                                        </>
                                    )}

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
                        {isParent ? "Ask them to add one!" : "Tap + to add your first wish."}
                    </Text>
                )}
            </View>

            {/* ✅ Add/Edit Modal  */}
            <WishlistItemModal
                visible={showAddModal}
                mode={editingItem ? "edit" : "add"}
                currency={FAMILY_CURRENCY}
                pointsPerCurrency={POINTS_PER_CURRENCY}
                selfFulfillMaxPrice={SELF_FULFILL_MAX_PRICE}
                title={newTitle}
                onChangeTitle={setNewTitle}
                price={newPrice}
                onChangePrice={setNewPrice}
                note={newNote}
                onChangeNote={setNewNote}
                link={newLink}
                onChangeLink={setNewLink}
                imageUri={newImageUri}
                onChangeImageUri={setNewImageUri}
                canFulfillSelf={canFulfillSelf}
                onChangeCanFulfillSelf={setCanFulfillSelf}
                paymentMethod={paymentMethod}
                onChangePaymentMethod={setPaymentMethod}
                previewPoints={previewPoints}
                exceedsSelfFulfillLimit={exceedsSelfFulfillLimit}
                onClose={() => {
                    setShowAddModal(false);
                    resetForm();
                }}
                onSubmit={handleSave}
            />

        </Screen>
    );
}

/* ----------------- styles ----------------- */

const styles = StyleSheet.create({
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
