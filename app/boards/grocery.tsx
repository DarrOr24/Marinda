import { Button } from "@/components/ui/button";
import { ScreenList } from "@/components/ui/screen-list";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useFamily } from "@/lib/families/families.hooks";
import { useSubscribeTableByFamily } from "@/lib/families/families.realtime";
import {
    addGroceryItem,
    deleteGroceryItems,
    fetchGroceryItems,
    updateGroceryItem,
    updateGroceryPurchased,
    type GroceryRow,
} from "@/lib/groceries/groceries.api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";


// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type GroceryItem = {
    id: string;
    family_id: string;
    name: string;
    category: string | undefined;
    added_by_member_id: string;
    is_checked: boolean;
    checked_at?: string | null;
    created_at: string;
    amount?: string;
};

// Updated Instacart-style categories
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

// helper
const shortId = (id?: string) =>
    id ? `ID ${String(id).slice(0, 8)}` : "—";

export default function Grocery() {
    const { activeFamilyId, member, family, members } = useAuthContext() as any;

    const { familyMembers } = useFamily(activeFamilyId);
    useSubscribeTableByFamily(
        "family_members",
        activeFamilyId,
        ["family-members", activeFamilyId]
    );

    // memberId → first name
    const nameForId = useMemo(() => {
        const list = (familyMembers?.data ?? members?.data ?? members ?? family?.members ?? []) as any[];
        const map: Record<string, string> = {};

        for (const m of list) {
            const id = m?.id ?? m?.member_id;
            if (!id) continue;

            const name =
                m?.nickname ||
                m?.profile?.first_name ||
                m?.first_name ||
                m?.profile?.name ||
                m?.name ||
                "";

            map[id] = name || shortId(id);
        }

        return (id?: string) => (id ? map[id] || shortId(id) : "—");
    }, [familyMembers?.data, family]);

    // ───────────────────────────────────────────────────────
    // STATE
    // ───────────────────────────────────────────────────────
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [viewMode, setViewMode] = useState<"category" | "all">("category");
    const [viewMenuOpen, setViewMenuOpen] = useState(false);

    // Add/edit modal state
    const [addOpen, setAddOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);

    const [name, setName] = useState("");
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [category, setCategory] = useState<string | undefined>(undefined);
    const [amount, setAmount] = useState("");

    // ───────────────────────────────────────────────────────
    // LOAD ITEMS
    // ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeFamilyId) return;
        let cancelled = false;

        (async () => {
            try {
                const rows = await fetchGroceryItems(activeFamilyId);
                if (cancelled) return;

                const mapped: GroceryItem[] = rows.map((r: GroceryRow) => ({
                    id: r.id,
                    family_id: r.family_id,
                    name: r.text,
                    category: r.category ?? undefined,
                    added_by_member_id: r.added_by_member_id,
                    is_checked: r.purchased,
                    checked_at: r.purchased_at,
                    created_at: r.created_at,
                    amount: r.amount ?? undefined,
                }));

                setItems(mapped);
            } catch (e) {
                console.error("fetchGroceryItems failed", e);
                Alert.alert("Error", "Could not load grocery list.");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeFamilyId]);

    // ───────────────────────────────────────────────────────
    // GROUPED MODE
    // ───────────────────────────────────────────────────────
    const grouped = useMemo(() => {
        const map = new Map<string, GroceryItem[]>();
        const catOr = (c?: string) => (c?.trim() ? c.trim() : "Uncategorized");

        for (const it of items) {
            const key = catOr(it.category);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(it);
        }

        for (const [, arr] of map) {
            arr.sort((a, b) => a.name.localeCompare(b.name));
        }

        return Array.from(map.entries()).sort(([a], [b]) =>
            a.localeCompare(b)
        );
    }, [items]);

    // ───────────────────────────────────────────────────────
    // FLAT LIST MODE (A → Z)
    // ───────────────────────────────────────────────────────
    const allSorted = useMemo(() => {
        return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    // ───────────────────────────────────────────────────────
    // FORM HELPERS
    // ───────────────────────────────────────────────────────
    function resetAddForm() {
        setName("");
        setCategory(undefined);
        setAmount("");
        setCategoryOpen(false);
        setEditingItem(null);
    }

    // save or edit item
    async function saveItem() {
        const trimmed = name.trim();
        if (!trimmed) {
            Alert.alert("Missing name", "Please enter an item name.");
            return;
        }

        if (!activeFamilyId) {
            Alert.alert("No family", "Missing active family.");
            return;
        }

        const familyId = activeFamilyId;
        const whoId = member?.id ?? member?.profile_id ?? "guest";

        // EDIT
        if (editingItem) {
            try {
                const row = await updateGroceryItem(editingItem.id, {
                    text: trimmed,
                    category: category?.trim() || undefined,
                    amount: amount.trim() || undefined,
                });

                const updated: GroceryItem = {
                    id: row.id,
                    family_id: row.family_id,
                    name: row.text,
                    category: row.category ?? undefined,
                    added_by_member_id: row.added_by_member_id,
                    is_checked: row.purchased,
                    checked_at: row.purchased_at,
                    created_at: row.created_at,
                    amount: row.amount ?? undefined,
                };

                setItems(prev =>
                    prev.map(it => (it.id === updated.id ? updated : it))
                );

                setAddOpen(false);
                resetAddForm();
            } catch (e) {
                console.error("updateGroceryItem failed", e);
                Alert.alert("Error", "Could not update grocery item.");
            }
            return;
        }

        // ADD
        try {
            const row = await addGroceryItem({
                familyId,
                text: trimmed,
                category: category?.trim() || undefined,
                amount: amount.trim() || undefined,
                addedByMemberId: whoId,
            });

            const newItem: GroceryItem = {
                id: row.id,
                family_id: row.family_id,
                name: row.text,
                category: row.category ?? undefined,
                added_by_member_id: row.added_by_member_id,
                is_checked: row.purchased,
                checked_at: row.purchased_at,
                created_at: row.created_at,
                amount: row.amount ?? undefined,
            };

            setItems(prev => [newItem, ...prev]);
            setAddOpen(false);
            resetAddForm();
        } catch (e) {
            console.error("addGroceryItem failed", e);
            Alert.alert("Error", "Could not add grocery item.");
        }
    }

    function startAdd() {
        resetAddForm();
        setAddOpen(true);
    }

    function startEdit(item: GroceryItem) {
        setEditingItem(item);
        setName(item.name);
        setCategory(item.category);
        setAmount(item.amount ?? "");
        setCategoryOpen(false);
        setAddOpen(true);
    }

    async function toggleChecked(id: string) {
        const target = items.find(i => i.id === id);
        if (!target) return;

        const next = !target.is_checked;

        try {
            const row = await updateGroceryPurchased(id, next);

            setItems(prev =>
                prev.map(it =>
                    it.id === id
                        ? { ...it, is_checked: row.purchased, checked_at: row.purchased_at }
                        : it
                )
            );
        } catch (e) {
            console.error("updateGroceryPurchased failed", e);
            Alert.alert("Error", "Could not update item.");
        }
    }

    function deleteChecked() {
        const checkedIds = items.filter(i => i.is_checked).map(i => i.id);
        if (!checkedIds.length) {
            Alert.alert("Nothing selected", "Check items to delete first.");
            return;
        }

        Alert.alert("Delete checked items?", "This will remove all checked items.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteGroceryItems(checkedIds);
                        setItems(prev => prev.filter(it => !it.is_checked));
                    } catch (e) {
                        console.error("deleteGroceryItems failed", e);
                        Alert.alert("Error", "Could not delete items.");
                    }
                },
            },
        ]);
    }

    function showItemInfo(it: GroceryItem) {
        const when = new Date(it.created_at).toLocaleString();
        const addedBy = nameForId(it.added_by_member_id);

        Alert.alert(
            it.name,
            `Added by: ${addedBy}
When: ${when}
Category: ${it.category ?? "Uncategorized"}${it.amount ? `\nAmount: ${it.amount}` : ""
            }`
        );
    }

    // ─────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────
    return (
        <ScreenList style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>

            <View style={styles.header}>
                {/* HEADER BUTTONS */}
                <View style={styles.actions}>
                    <Button
                        type="outline"
                        size="sm"
                        title="Add"
                        onPress={startAdd}
                        leftIcon={<MaterialCommunityIcons name="plus" size={18} />}
                    />

                    <Button
                        type="outline"
                        size="sm"
                        title="Delete Checked"
                        onPress={deleteChecked}
                        leftIcon={<MaterialCommunityIcons name="trash-can-outline" size={18} />}
                        backgroundColor="#fff5f5"
                        style={{ borderColor: "#fecaca" }}
                        leftIconColor="#b91c1c"
                    />

                    <View style={{ position: "relative" }}>
                        <Button
                            type="outline"
                            size="sm"
                            title="View"
                            onPress={() => setViewMenuOpen(v => !v)}
                            rightIcon={<MaterialCommunityIcons name="menu-down" size={18} />}
                        />
                        {/* keep your dropdown as-is */}
                        {viewMenuOpen && (
                            <View style={styles.viewMenu}>
                                <Pressable
                                    style={styles.viewOption}
                                    onPress={() => {
                                        setViewMode("category");
                                        setViewMenuOpen(false);
                                    }}
                                >
                                    <Text style={styles.viewOptionText}>By Category</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.viewOption}
                                    onPress={() => {
                                        setViewMode("all");
                                        setViewMenuOpen(false);
                                    }}
                                >
                                    <Text style={styles.viewOptionText}>All Items (A → Z)</Text>
                                </Pressable>
                            </View>
                        )}

                    </View>
                </View>
            </View>

            {/* LIST — SWITCHES BASED ON viewMode */}
            {viewMode === "category" ? (
                <FlatList
                    data={grouped}
                    keyExtractor={([cat]) => cat}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item: [cat, arr] }) => (
                        <View style={styles.group}>
                            <Text style={styles.groupTitle}>{cat}</Text>

                            {arr.map(it => (
                                <Pressable
                                    key={it.id}
                                    onLongPress={() => showItemInfo(it)}
                                    onPress={() => toggleChecked(it.id)}
                                    style={[styles.row, it.is_checked && styles.rowChecked]}
                                >
                                    <TouchableOpacity
                                        onPress={e => {
                                            e.stopPropagation();
                                            toggleChecked(it.id);
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name={
                                                it.is_checked
                                                    ? "checkbox-marked"
                                                    : "checkbox-blank-outline"
                                            }
                                            size={22}
                                            color={it.is_checked ? "#2563eb" : "#64748b"}
                                        />
                                    </TouchableOpacity>

                                    <View style={styles.rowLine}>
                                        <Text
                                            numberOfLines={1}
                                            style={[
                                                styles.rowText,
                                                it.is_checked && styles.rowTextDone,
                                            ]}
                                        >
                                            {it.name}
                                        </Text>

                                        {it.amount && (
                                            <View style={styles.amountPill}>
                                                <Text style={styles.amountPillText}>
                                                    {it.amount}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* edit */}
                                    <TouchableOpacity
                                        onPress={e => {
                                            e.stopPropagation();
                                            startEdit(it);
                                        }}
                                        style={styles.infoBtn}
                                    >
                                        <MaterialCommunityIcons
                                            name="pencil-outline"
                                            size={20}
                                            color="#0f172a"
                                        />
                                    </TouchableOpacity>

                                    {/* info */}
                                    <TouchableOpacity
                                        onPress={e => {
                                            e.stopPropagation();
                                            showItemInfo(it);
                                        }}
                                        style={styles.infoBtn}
                                    >
                                        <MaterialCommunityIcons
                                            name="information-outline"
                                            size={20}
                                            color="#475569"
                                        />
                                    </TouchableOpacity>
                                </Pressable>
                            ))}
                        </View>
                    )}
                />
            ) : (
                // FLAT LIST MODE
                <FlatList
                    data={allSorted}
                    keyExtractor={it => it.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item: it }) => (
                        <Pressable
                            onLongPress={() => showItemInfo(it)}
                            onPress={() => toggleChecked(it.id)}
                            style={[styles.row, it.is_checked && styles.rowChecked]}
                        >
                            <TouchableOpacity
                                onPress={e => {
                                    e.stopPropagation();
                                    toggleChecked(it.id);
                                }}
                            >
                                <MaterialCommunityIcons
                                    name={
                                        it.is_checked
                                            ? "checkbox-marked"
                                            : "checkbox-blank-outline"
                                    }
                                    size={22}
                                    color={it.is_checked ? "#2563eb" : "#64748b"}
                                />
                            </TouchableOpacity>

                            <View style={styles.rowLine}>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.rowText,
                                        it.is_checked && styles.rowTextDone,
                                    ]}
                                >
                                    {it.name}
                                </Text>

                                {it.amount && (
                                    <View style={styles.amountPill}>
                                        <Text style={styles.amountPillText}>{it.amount}</Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                onPress={e => {
                                    e.stopPropagation();
                                    startEdit(it);
                                }}
                                style={styles.infoBtn}
                            >
                                <MaterialCommunityIcons
                                    name="pencil-outline"
                                    size={20}
                                    color="#0f172a"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={e => {
                                    e.stopPropagation();
                                    showItemInfo(it);
                                }}
                                style={styles.infoBtn}
                            >
                                <MaterialCommunityIcons
                                    name="information-outline"
                                    size={20}
                                    color="#475569"
                                />
                            </TouchableOpacity>
                        </Pressable>
                    )}
                />
            )}

            {/* ADD / EDIT MODAL */}
            <Modal
                visible={addOpen}
                animationType="fade"
                transparent
                onRequestClose={() => {
                    setAddOpen(false);
                    resetAddForm();
                }}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            {editingItem ? "Edit Grocery Item" : "Add Grocery Item"}
                        </Text>

                        <Text style={styles.label}>Item</Text>
                        <TextInput
                            placeholder="e.g., Bananas"
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                            autoFocus
                        />

                        <Text style={styles.label}>Category</Text>
                        <TouchableOpacity
                            onPress={() => setCategoryOpen(v => !v)}
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
                                        setCategory(undefined);
                                        setCategoryOpen(false);
                                    }}
                                    style={styles.menuItem}
                                >
                                    <Text style={styles.menuItemTxt}>— None —</Text>
                                </Pressable>

                                {DEFAULT_CATEGORIES.map(c => (
                                    <Pressable
                                        key={c}
                                        onPress={() => {
                                            setCategory(c);
                                            setCategoryOpen(false);
                                        }}
                                        style={styles.menuItem}
                                    >
                                        <Text style={styles.menuItemTxt}>{c}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        <Text style={styles.label}>Amount (optional)</Text>
                        <TextInput
                            placeholder="e.g., 2, 3 packs, 1kg"
                            placeholderTextColor="#94a3b8"
                            value={amount}
                            onChangeText={setAmount}
                            style={styles.input}
                        />

                        <View style={styles.modalActions}>
                            <Button
                                type="outline"
                                size="sm"
                                title="Cancel"
                                onPress={() => {
                                    setAddOpen(false);
                                    resetAddForm();
                                }}
                            />

                            <Button
                                type="primary"
                                size="sm"
                                title={editingItem ? "Save" : "Add"}
                                onPress={saveItem}
                            />
                        </View>

                    </View>
                </View>
            </Modal>
        </ScreenList>
    );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F6FAFF" },

    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    actions: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
    },

    listContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 32,
    },

    group: {
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 16,
        marginBottom: 12,
        overflow: "hidden",
    },

    groupTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#334155",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#f1f5f9",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    rowChecked: { backgroundColor: "#f5faff" },
    rowText: { fontSize: 16, color: "#0f172a" },
    rowTextDone: { color: "#64748b", textDecorationLine: "line-through" },

    rowLine: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },

    amountPill: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: "#e2e8f0",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    amountPillText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0f172a",
    },

    infoBtn: { padding: 6 },

    // View dropdown
    viewMenu: {
        position: "absolute",
        top: 44,
        right: 0,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        paddingVertical: 4,
        width: 180,
        zIndex: 99,
        elevation: 12,
    },
    viewOption: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    viewOptionText: {
        fontSize: 15,
        color: "#0f172a",
    },

    // Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
    },
    modalCard: {
        width: "100%",
        maxWidth: 460,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    modalTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 12 },

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
    menuItemTxt: { color: "#0f172a", fontSize: 16 },

    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 16,
    },
});
