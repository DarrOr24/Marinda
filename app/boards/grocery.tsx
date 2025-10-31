import { useAuthContext } from "@/hooks/use-auth-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
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

const makeId = () =>
    (globalThis as any)?.crypto?.randomUUID
        ? (globalThis as any).crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getDisplayName = (p?: any, u?: any) => {
    // prefer first + last from your public profile table
    const full = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
    if (full) return full;

    // common places Supabase stores names
    const metaName = u?.user_metadata?.full_name || u?.user_metadata?.name;
    if (metaName) return metaName;

    // last resort: email
    if (u?.email) return u.email;

    return 'Someone';
};

// ── Types ─────────────────────────────────────────────────────────────
type GroceryItem = {
    id: string;
    family_id: string;
    name: string;
    category: string | undefined; // DB will store null later
    added_by_member_id: string;
    is_checked: boolean;
    checked_at?: string | null;   // ISO string when checked
    created_at: string;           // ISO string
    addedByName?: string;         // UI-only helper (not in DB)
};

const DEFAULT_CATEGORIES = [
    "Produce",
    "Dairy",
    "Bakery",
    "Pantry",
    "Meat",
    "Frozen",
    "Drinks",
    "Household",
    "Other",
];

// ── Component ────────────────────────────────────────────────────────
export default function Grocery() {
    const { profile, user, session } = useAuthContext() as any;
    const authUser = user ?? session?.user; // handles either shape
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [addOpen, setAddOpen] = useState(false);
    const [name, setName] = useState("");
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [category, setCategory] = useState<string | undefined>(undefined);

    // Group by category and sort: unchecked first, then A→Z
    const grouped = useMemo(() => {
        const map = new Map<string, GroceryItem[]>();
        const catOr = (c?: string) => (c?.trim() ? c.trim() : "Uncategorized");

        for (const it of items) {
            const key = catOr(it.category);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(it);
        }

        for (const [, arr] of map) {
            arr.sort((a, b) => {
                if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
                return a.name.localeCompare(b.name);
            });
        }

        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [items]);

    function resetAddForm() {
        setName("");
        setCategory(undefined);
    }

    function addItem() {
        const trimmed = name.trim();
        if (!trimmed) {
            Alert.alert("Missing name", "Please enter an item name.");
            return;
        }

        const whoId = profile?.id ?? authUser?.id ?? "guest";
        const whoName = getDisplayName(profile, authUser);
        const familyId = profile?.familyId ?? "temp-family"; // keep temp until backend wires this

        const newItem: GroceryItem = {
            id: makeId(),
            family_id: familyId,
            name: trimmed,
            category: category?.trim() || undefined,
            added_by_member_id: whoId,
            is_checked: false,
            checked_at: null,
            created_at: new Date().toISOString(),
            addedByName: whoName, // now resolves from profile/session/email
        };

        setItems((prev) => [newItem, ...prev]);
        setAddOpen(false);
        resetAddForm();
    }


    function toggleChecked(id: string) {
        setItems((prev) =>
            prev.map((it) =>
                it.id === id
                    ? {
                        ...it,
                        is_checked: !it.is_checked,
                        checked_at: !it.is_checked ? new Date().toISOString() : null,
                    }
                    : it
            )
        );
    }

    function deleteChecked() {
        const anyChecked = items.some((i) => i.is_checked);
        if (!anyChecked) {
            Alert.alert("Nothing selected", "Check items to delete first.");
            return;
        }
        Alert.alert("Delete checked items?", "This will remove all checked items.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => setItems((prev) => prev.filter((it) => !it.is_checked)),
            },
        ]);
    }

    function showItemInfo(it: GroceryItem) {
        const when = new Date(it.created_at).toLocaleString();
        Alert.alert(
            it.name,
            `Added by: ${it.addedByName ?? it.added_by_member_id}\nWhen: ${when}\nCategory: ${it.category ?? "Uncategorized"
            }`
        );
    }

    return (
        <View style={styles.screen}>
            {/* Header row (actions) */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.btn} onPress={() => setAddOpen(true)}>
                    <MaterialCommunityIcons name="plus" size={18} />
                    <Text style={styles.btnTxt}>Add</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={deleteChecked}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} />
                    <Text style={[styles.btnTxt, styles.btnDangerTxt]}>Delete Checked</Text>
                </TouchableOpacity>
            </View>

            {/* List grouped by category */}
            <FlatList
                data={grouped}
                keyExtractor={([cat]) => cat}
                contentContainerStyle={styles.listContent}
                renderItem={({ item: [cat, arr] }) => (
                    <View style={styles.group}>
                        <Text style={styles.groupTitle}>{cat}</Text>

                        {arr.map((it) => (
                            <Pressable
                                key={it.id}
                                onLongPress={() => showItemInfo(it)}
                                onPress={() => toggleChecked(it.id)}
                                style={[styles.row, it.is_checked && styles.rowChecked]}
                            >
                                <MaterialCommunityIcons
                                    name={it.is_checked ? "checkbox-marked" : "checkbox-blank-outline"}
                                    size={22}
                                    color={it.is_checked ? "#2563eb" : "#64748b"}
                                />
                                <View style={styles.rowTextWrap}>
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.rowText, it.is_checked && styles.rowTextDone]}
                                    >
                                        {it.name}
                                    </Text>
                                    {!!it.category && <Text style={styles.rowSub}>{it.category}</Text>}
                                </View>

                                {/* info icon */}
                                <TouchableOpacity onPress={() => showItemInfo(it)} style={styles.infoBtn}>
                                    <MaterialCommunityIcons name="information-outline" size={20} color="#475569" />
                                </TouchableOpacity>
                            </Pressable>
                        ))}
                    </View>
                )}
            />

            {/* Add item modal */}
            <Modal
                visible={addOpen}
                animationType="fade"
                transparent
                onRequestClose={() => setAddOpen(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Add Grocery Item</Text>

                        <Text style={styles.label}>Item</Text>
                        <TextInput
                            placeholder="e.g., Bananas"
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                            autoFocus
                        />

                        <Text style={styles.label}>Category (optional)</Text>
                        {/* simple "menu": tap to open a mini picker list */}
                        <TouchableOpacity
                            onPress={() => setCategoryOpen((v) => !v)}
                            style={styles.select}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.selectText}>{category ?? "Select a category"}</Text>
                            <MaterialCommunityIcons name="menu-down" size={22} color="#334155" />
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
                                {DEFAULT_CATEGORIES.map((c) => (
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

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    setAddOpen(false);
                                    resetAddForm();
                                }}
                                style={[styles.btn, styles.btnGhost]}
                            >
                                <Text style={styles.btnTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={addItem} style={[styles.btn, styles.btnPrimary]}>
                                <Text style={[styles.btnTxt, styles.btnPrimaryTxt]}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F6FAFF",
        padding: 12,
        gap: 12,
    },

    actions: {
        flexDirection: "row",
        gap: 10,
    },
    btn: {
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    btnTxt: { color: "#0f172a", fontWeight: "600" },
    btnDanger: {
        backgroundColor: "#fff5f5",
        borderColor: "#fecaca",
    },
    btnDangerTxt: { color: "#b91c1c" },
    btnGhost: {
        backgroundColor: "#fff",
    },
    btnPrimary: {
        backgroundColor: "#2563eb",
        borderColor: "#1d4ed8",
    },
    btnPrimaryTxt: {
        color: "#fff",
        fontWeight: "700",
    },

    listContent: {
        paddingBottom: 40,
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
    rowChecked: {
        backgroundColor: "#f5faff",
    },
    rowTextWrap: {
        flex: 1,
    },
    rowText: {
        fontSize: 16,
        color: "#0f172a",
    },
    rowTextDone: {
        color: "#64748b",
        textDecorationLine: "line-through",
    },
    rowSub: {
        fontSize: 12,
        color: "#64748b",
    },
    infoBtn: {
        padding: 6,
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
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        color: "#475569",
        marginTop: 8,
        marginBottom: 4,
    },
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
    menuItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    menuItemTxt: {
        color: "#0f172a",
        fontSize: 16,
    },

    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 16,
    },
});
