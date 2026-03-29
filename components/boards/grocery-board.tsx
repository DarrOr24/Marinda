import { GroceryItemModal } from '@/components/modals/grocery-item-modal';
import { ChipSelector } from '@/components/chip-selector';
import { Button, MetaRow, ModalDialog, ModalPopover, Screen, TextInput } from '@/components/ui';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useFamily } from '@/lib/families/families.hooks';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    addGroceryItem,
    deleteGroceryItems,
    fetchGroceryItems,
    updateGroceryItem,
    updateGroceryPurchased,
    type GroceryRow,
} from '@/lib/groceries/groceries.api';
import { createShoppingTab, fetchShoppingTabs } from '@/lib/groceries/shopping-tabs.api';
import {
    DEFAULT_SHOPPING_TABS,
    GROCERIES_LIST_KIND,
    type ShoppingTab,
} from '@/lib/groceries/shopping.types';
import { getAvatarPublicUrl } from '@/lib/profiles/profiles.api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type GroceryItem = {
    id: string;
    family_id: string;
    name: string;
    category: string | undefined;
    list_kind: string;
    added_by_member_id: string;
    is_checked: boolean;
    checked_at?: string | null;
    created_at: string;
    amount?: string;
};

const shortId = (id?: string) =>
    id ? `ID ${String(id).slice(0, 8)}` : '—';

export default function Grocery() {
    const router = useRouter();
    const viewMenuAnchorRef = useRef<View>(null);
    const { activeFamilyId, effectiveMember, family, members, hasParentPermissions } =
        useAuthContext() as any;

    const { familyMembers } = useFamily(activeFamilyId);

    const rawMembers: any[] = useMemo(
        () =>
            (familyMembers?.data ??
                members?.data ??
                members ??
                family?.members ??
                []) as any[],
        [familyMembers?.data, members, family],
    );

    const nameForId = useMemo(() => {
        const map: Record<string, string> = {};

        for (const m of rawMembers) {
            const id = m?.id ?? m?.member_id;
            if (!id) continue;

            const name =
                m?.nickname ||
                m?.profile?.first_name ||
                m?.first_name ||
                m?.profile?.name ||
                m?.name ||
                '';

            map[id] = name || shortId(id);
        }

        return (id?: string) => (id ? map[id] || shortId(id) : '—');
    }, [rawMembers]);

    const avatarUrlForMemberId = useMemo(() => {
        const map: Record<string, string | null> = {};
        for (const m of rawMembers) {
            const id = m?.id ?? m?.member_id;
            if (!id) continue;
            const pub = m?.public_avatar_url;
            if (typeof pub === 'string' && pub.length > 0) {
                map[id] = pub;
                continue;
            }
            const path = m?.profile?.avatar_url ?? m?.avatar_url ?? null;
            map[id] = path ? getAvatarPublicUrl(path) : null;
        }
        return (memberId: string) => map[memberId] ?? null;
    }, [rawMembers]);

    const [items, setItems] = useState<GroceryItem[]>([]);
    const [customTabs, setCustomTabs] = useState<ShoppingTab[]>([]);
    const [activeListKind, setActiveListKind] = useState<string>(GROCERIES_LIST_KIND);
    const [viewMode, setViewMode] = useState<'category' | 'member' | 'all'>('category');
    const [viewMenuOpen, setViewMenuOpen] = useState(false);

    const [addOpen, setAddOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
    const [infoItem, setInfoItem] = useState<GroceryItem | null>(null);

    const [name, setName] = useState('');
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [category, setCategory] = useState<string | undefined>(undefined);
    const [listOpen, setListOpen] = useState(false);
    const [formListKind, setFormListKind] = useState<string>(GROCERIES_LIST_KIND);
    const [amount, setAmount] = useState('');

    const [showAddTabModal, setShowAddTabModal] = useState(false);
    const [newTabLabel, setNewTabLabel] = useState('');
    const [creatingTab, setCreatingTab] = useState(false);

    const ALL_TABS: ShoppingTab[] = useMemo(
        () => [...DEFAULT_SHOPPING_TABS, ...customTabs],
        [customTabs],
    );

    const tabIds = useMemo(() => ALL_TABS.map((t) => t.id), [ALL_TABS]);
    useEffect(() => {
        if (!tabIds.includes(activeListKind) && tabIds.length > 0) {
            setActiveListKind(tabIds[0]);
        }
    }, [tabIds, activeListKind]);

    const tabLabelById = useMemo(() => {
        const m = new Map<string, string>();
        for (const t of ALL_TABS) m.set(t.id, t.label);
        return m;
    }, [ALL_TABS]);

    const activeTab = ALL_TABS.find((t) => t.id === activeListKind) ?? ALL_TABS[0];
    const isGroceriesList = activeListKind === GROCERIES_LIST_KIND;

    const tabItems = useMemo(
        () => items.filter((it) => it.list_kind === activeListKind),
        [items, activeListKind],
    );

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
                    list_kind: r.list_kind || GROCERIES_LIST_KIND,
                    added_by_member_id: r.added_by_member_id,
                    is_checked: r.purchased,
                    checked_at: r.purchased_at,
                    created_at: r.created_at,
                    amount: r.amount ?? undefined,
                }));

                setItems(mapped);
            } catch (e) {
                console.error('fetchGroceryItems failed', e);
                Alert.alert('Error', 'Could not load shopping list.');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeFamilyId]);

    const reloadCustomTabs = useCallback(async () => {
        if (!activeFamilyId) return;
        try {
            const list = await fetchShoppingTabs(activeFamilyId);
            setCustomTabs(list);
        } catch (e) {
            console.error('fetchShoppingTabs failed', e);
        }
    }, [activeFamilyId]);

    useFocusEffect(
        useCallback(() => {
            void reloadCustomTabs();
        }, [reloadCustomTabs]),
    );

    useEffect(() => {
        setViewMenuOpen(false);
        if (isGroceriesList) {
            setViewMode('category');
        } else {
            setViewMode('member');
        }
    }, [isGroceriesList]);

    function closeViewMenu() {
        setViewMenuOpen(false);
    }

    function toggleViewMenu() {
        if (viewMenuOpen) {
            closeViewMenu();
            return;
        }
        setViewMenuOpen(true);
    }

    const grouped = useMemo(() => {
        const map = new Map<string, GroceryItem[]>();
        const catOr = (c?: string) => (c?.trim() ? c.trim() : 'Uncategorized');

        for (const it of tabItems) {
            const key = catOr(it.category);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(it);
        }

        for (const [, arr] of map) {
            arr.sort((a, b) => a.name.localeCompare(b.name));
        }

        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [tabItems]);

    const allSorted = useMemo(() => {
        return [...tabItems].sort((a, b) => a.name.localeCompare(b.name));
    }, [tabItems]);

    const groupedByMember = useMemo(() => {
        const map = new Map<string, GroceryItem[]>();
        for (const it of tabItems) {
            const key = it.added_by_member_id || '—';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(it);
        }
        for (const [, arr] of map) {
            arr.sort((a, b) => a.name.localeCompare(b.name));
        }
        return Array.from(map.entries()).sort(([idA], [idB]) =>
            nameForId(idA).localeCompare(nameForId(idB)),
        );
    }, [tabItems, nameForId]);

    function resetAddForm() {
        setName('');
        setCategory(undefined);
        setFormListKind(activeListKind);
        setAmount('');
        setCategoryOpen(false);
        setListOpen(false);
        setEditingItem(null);
    }

    async function saveItem() {
        const trimmed = name.trim();
        if (!trimmed) {
            Alert.alert('Missing name', 'Please enter an item name.');
            return;
        }

        if (!activeFamilyId) {
            Alert.alert('No family', 'Missing active family.');
            return;
        }

        const familyId = activeFamilyId;
        const whoId = effectiveMember?.id ?? effectiveMember?.profile_id ?? 'guest';
        const kind = formListKind.trim() || GROCERIES_LIST_KIND;
        const categoryForSave =
            kind === GROCERIES_LIST_KIND ? (category?.trim() || undefined) : undefined;

        if (editingItem) {
            try {
                const row = await updateGroceryItem(editingItem.id, {
                    text: trimmed,
                    category: categoryForSave,
                    listKind: kind,
                    amount: amount.trim() || undefined,
                });

                const updated: GroceryItem = {
                    id: row.id,
                    family_id: row.family_id,
                    name: row.text,
                    category: row.category ?? undefined,
                    list_kind: row.list_kind || GROCERIES_LIST_KIND,
                    added_by_member_id: row.added_by_member_id,
                    is_checked: row.purchased,
                    checked_at: row.purchased_at,
                    created_at: row.created_at,
                    amount: row.amount ?? undefined,
                };

                setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));

                setAddOpen(false);
                resetAddForm();
            } catch (e) {
                console.error('updateGroceryItem failed', e);
                Alert.alert('Error', 'Could not update shopping item.');
            }
            return;
        }

        try {
            const row = await addGroceryItem({
                familyId,
                text: trimmed,
                category: categoryForSave,
                listKind: kind,
                amount: amount.trim() || undefined,
                addedByMemberId: whoId,
            });

            const newItem: GroceryItem = {
                id: row.id,
                family_id: row.family_id,
                name: row.text,
                category: row.category ?? undefined,
                list_kind: row.list_kind || GROCERIES_LIST_KIND,
                added_by_member_id: row.added_by_member_id,
                is_checked: row.purchased,
                checked_at: row.purchased_at,
                created_at: row.created_at,
                amount: row.amount ?? undefined,
            };

            setItems((prev) => [newItem, ...prev]);
            setAddOpen(false);
            resetAddForm();
        } catch (e) {
            console.error('addGroceryItem failed', e);
            Alert.alert('Error', 'Could not add shopping item.');
        }
    }

    function startAdd() {
        resetAddForm();
        setFormListKind(activeListKind);
        setAddOpen(true);
    }

    function startEdit(item: GroceryItem) {
        setEditingItem(item);
        setName(item.name);
        setCategory(item.list_kind === GROCERIES_LIST_KIND ? item.category : undefined);
        setFormListKind(item.list_kind);
        setAmount(item.amount ?? '');
        setCategoryOpen(false);
        setListOpen(false);
        setAddOpen(true);
    }

    async function toggleChecked(id: string) {
        const target = items.find((i) => i.id === id);
        if (!target) return;

        const next = !target.is_checked;

        try {
            const row = await updateGroceryPurchased(id, next);

            setItems((prev) =>
                prev.map((it) =>
                    it.id === id
                        ? { ...it, is_checked: row.purchased, checked_at: row.purchased_at }
                        : it,
                ),
            );
        } catch (e) {
            console.error('updateGroceryPurchased failed', e);
            Alert.alert('Error', 'Could not update item.');
        }
    }

    function deleteChecked() {
        const checkedIds = tabItems.filter((i) => i.is_checked).map((i) => i.id);
        if (!checkedIds.length) {
            Alert.alert('Nothing selected', 'Check items to delete first.');
            return;
        }

        Alert.alert('Delete checked items?', 'This will remove all checked items on this list.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteGroceryItems(checkedIds);
                        setItems((prev) => prev.filter((it) => !checkedIds.includes(it.id)));
                    } catch (e) {
                        console.error('deleteGroceryItems failed', e);
                        Alert.alert('Error', 'Could not delete items.');
                    }
                },
            },
        ]);
    }

    function showItemInfo(it: GroceryItem) {
        setInfoItem(it);
    }

    function renderMemberGroupHeader(memberId: string) {
        const label = nameForId(memberId);
        const url = avatarUrlForMemberId(memberId);
        const initial = label.trim().charAt(0).toUpperCase() || '?';
        return (
            <View style={[styles.groupTitleBar, styles.groupTitleMemberRow]}>
                {url ? (
                    <Image
                        source={{ uri: url }}
                        style={styles.groupMemberAvatar}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.groupMemberAvatar, styles.groupMemberAvatarPlaceholder]}>
                        <Text style={styles.groupMemberAvatarInitial}>{initial}</Text>
                    </View>
                )}
                <Text style={styles.groupTitleMemberName} numberOfLines={1}>
                    {label}
                </Text>
            </View>
        );
    }

    async function handleCreateTab() {
        const trimmed = newTabLabel.trim();
        if (!trimmed || !activeFamilyId) return;

        setCreatingTab(true);
        try {
            const tab = await createShoppingTab({
                familyId: activeFamilyId,
                label: trimmed,
            });
            setCustomTabs((prev) =>
                [...prev, tab].sort(
                    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label),
                ),
            );
            setActiveListKind(tab.id);
            setShowAddTabModal(false);
            setNewTabLabel('');
        } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not create list.');
        } finally {
            setCreatingTab(false);
        }
    }

    function renderRow(it: GroceryItem) {
        return (
            <Pressable
                key={it.id}
                onLongPress={() => showItemInfo(it)}
                onPress={() => toggleChecked(it.id)}
                style={[styles.row, it.is_checked && styles.rowChecked]}
            >
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        toggleChecked(it.id);
                    }}
                >
                    <MaterialCommunityIcons
                        name={it.is_checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={it.is_checked ? '#2563eb' : '#64748b'}
                    />
                </TouchableOpacity>

                <View style={styles.rowLine}>
                    <Text
                        numberOfLines={1}
                        style={[styles.rowText, it.is_checked && styles.rowTextDone]}
                    >
                        {it.name}
                    </Text>

                    {it.amount && (
                        <View style={styles.amountPill}>
                            <Text style={styles.amountPillText}>{it.amount}</Text>
                        </View>
                    )}
                </View>

                <Button
                    type="ghost"
                    size="sm"
                    round
                    hitSlop={10}
                    leftIcon={<MaterialCommunityIcons name="pencil-outline" size={20} />}
                    leftIconColor="#0f172a"
                    onPress={(e) => {
                        e?.stopPropagation?.();
                        startEdit(it);
                    }}
                />

                <Button
                    type="ghost"
                    size="sm"
                    round
                    hitSlop={10}
                    leftIcon={<MaterialCommunityIcons name="information-outline" size={20} />}
                    leftIconColor="#475569"
                    onPress={(e) => {
                        e?.stopPropagation?.();
                        showItemInfo(it);
                    }}
                />
            </Pressable>
        );
    }

    return (
        <Screen scroll={false} withBackground={false} gap="no" contentStyle={styles.screenContent}>
            <View style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.toolbarRow}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.actionsScroll}
                            contentContainerStyle={styles.actionsScrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Button
                                type="outline"
                                size="sm"
                                title="Add"
                                onPress={startAdd}
                                style={styles.actionChip}
                                leftIcon={<MaterialCommunityIcons name="plus" size={18} />}
                            />

                            <Button
                                type="outline"
                                size="sm"
                                title="Delete"
                                onPress={deleteChecked}
                                style={[styles.actionChip, { borderColor: '#fecaca' }]}
                                leftIcon={<MaterialCommunityIcons name="trash-can-outline" size={18} />}
                                rightIcon={
                                    <MaterialCommunityIcons name="checkbox-multiple-marked" size={18} />
                                }
                                backgroundColor="#fff5f5"
                                leftIconColor="#b91c1c"
                                rightIconColor="#b91c1c"
                                titleColor="#b91c1c"
                            />
                        </ScrollView>

                        <View ref={viewMenuAnchorRef} collapsable={false} style={styles.viewMenuAnchor}>
                            <Button
                                type="outline"
                                size="sm"
                                title="View"
                                onPress={toggleViewMenu}
                                rightIcon={<MaterialCommunityIcons name="menu-down" size={18} />}
                            />
                        </View>

                        {hasParentPermissions ? (
                            <View style={styles.toolbarIcons}>
                                <Button
                                    type="outline"
                                    size="sm"
                                    backgroundColor="#eef2ff"
                                    round
                                    hitSlop={8}
                                    title=""
                                    onPress={() => router.push('/shopping/settings')}
                                    leftIcon={<Ionicons name="settings-outline" size={20} />}
                                />
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.tabsContainer}>
                        <ChipSelector
                            horizontal
                            value={activeListKind}
                            onChange={(val) => {
                                if (!val) return;
                                setActiveListKind(val);
                            }}
                            allowDeselect={false}
                            options={ALL_TABS.map((t) => ({ label: t.label, value: t.id }))}
                            chipStyle={(active) => ({
                                backgroundColor: active ? '#eff6ff' : '#f9fafb',
                                borderColor: active ? '#2563eb' : '#d4d4d4',
                            })}
                            chipTextStyle={(active) => ({
                                color: active ? '#1d4ed8' : '#4b5563',
                                fontWeight: active ? '600' : '500',
                            })}
                            trailingElement={
                                <Button
                                    type="outline"
                                    size="sm"
                                    backgroundColor="#eef2ff"
                                    round
                                    hitSlop={8}
                                    title=""
                                    leftIcon={<MaterialCommunityIcons name="plus" size={16} />}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        minWidth: 28,
                                        minHeight: 28,
                                        alignSelf: 'center',
                                    }}
                                    onPress={() => {
                                        setNewTabLabel('');
                                        setShowAddTabModal(true);
                                    }}
                                />
                            }
                        />
                    </View>
                </View>

                <ScrollView
                    style={styles.listScroll}
                    contentContainerStyle={[
                        styles.listContent,
                        tabItems.length === 0 && styles.listContentEmpty,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                    scrollEnabled={!viewMenuOpen}
                >
                    {tabItems.length === 0 ? (
                        <View
                            style={styles.emptyState}
                            accessibilityLabel={`${activeTab?.emptyText ?? ''} Tap Add to add your first item.`}
                        >
                            <MaterialCommunityIcons
                                name="cart-outline"
                                size={44}
                                color="#cbd5e1"
                                style={styles.emptyIcon}
                            />
                            <Text style={styles.emptyTitle}>
                                {activeTab?.emptyText ?? 'Nothing on this list yet.'}
                            </Text>
                            <Text style={styles.emptyHint}>Tap Add to add your first item.</Text>
                        </View>
                    ) : isGroceriesList && viewMode === 'category' ? (
                        grouped.map(([cat, arr]) => (
                            <View key={cat} style={styles.group}>
                                <View style={styles.groupTitleBar}>
                                    <Text style={styles.groupTitleText}>{cat}</Text>
                                </View>
                                {arr.map((it) => renderRow(it))}
                            </View>
                        ))
                    ) : viewMode === 'member' ? (
                        groupedByMember.map(([memberId, arr]) => (
                            <View key={memberId} style={styles.group}>
                                {renderMemberGroupHeader(memberId)}
                                {arr.map((it) => renderRow(it))}
                            </View>
                        ))
                    ) : (
                        <View style={styles.group}>
                            {allSorted.map((it) => renderRow(it))}
                        </View>
                    )}
                </ScrollView>
            </View>

            <GroceryItemModal
                visible={addOpen}
                mode={editingItem ? 'edit' : 'add'}
                name={name}
                onChangeName={setName}
                category={category}
                onChangeCategory={(next) => {
                    setCategory(next);
                    setCategoryOpen(false);
                }}
                showCategory={formListKind === GROCERIES_LIST_KIND}
                tabs={ALL_TABS}
                listKind={formListKind}
                onChangeListKind={(next) => {
                    setFormListKind(next);
                    setListOpen(false);
                    if (next !== GROCERIES_LIST_KIND) setCategory(undefined);
                }}
                amount={amount}
                onChangeAmount={setAmount}
                categoryOpen={categoryOpen}
                onToggleCategoryOpen={() => {
                    setListOpen(false);
                    setCategoryOpen((v) => !v);
                }}
                listOpen={listOpen}
                onToggleListOpen={() => {
                    setCategoryOpen(false);
                    setListOpen((v) => !v);
                }}
                onCancel={() => {
                    setAddOpen(false);
                    resetAddForm();
                }}
                onSubmit={saveItem}
            />

            <ModalDialog visible={showAddTabModal} onClose={() => setShowAddTabModal(false)} size="md">
                <View>
                    <Text style={styles.addTabTitle}>New shopping list</Text>

                    <Text style={styles.addTabHint}>
                        Name only — you can rename or delete custom lists anytime in settings.
                    </Text>

                    <TextInput
                        placeholder="List name (e.g., Amazon, Clothes, School supplies)"
                        value={newTabLabel}
                        onChangeText={setNewTabLabel}
                        containerStyle={{ marginBottom: 10 }}
                    />

                    <View style={styles.addTabActions}>
                        <Button
                            type="ghost"
                            size="sm"
                            title="Cancel"
                            titleColor="#475569"
                            onPress={() => setShowAddTabModal(false)}
                        />
                        <Button
                            type="primary"
                            size="sm"
                            title={creatingTab ? '…' : 'Create'}
                            disabled={!newTabLabel.trim() || creatingTab}
                            onPress={() => void handleCreateTab()}
                        />
                    </View>
                </View>
            </ModalDialog>

            <ModalDialog visible={!!infoItem} onClose={() => setInfoItem(null)} size="md">
                <View>
                    {infoItem && (
                        <>
                            <Text style={styles.infoModalTitle}>{infoItem.name}</Text>
                            <MetaRow label="Added by" value={nameForId(infoItem.added_by_member_id)} spacing={6} />
                            <MetaRow
                                label="When"
                                value={new Date(infoItem.created_at).toLocaleString()}
                                spacing={6}
                            />
                            <MetaRow
                                label="List"
                                value={tabLabelById.get(infoItem.list_kind) ?? infoItem.list_kind}
                                spacing={6}
                            />
                            {infoItem.list_kind === GROCERIES_LIST_KIND ? (
                                <MetaRow
                                    label="Category"
                                    value={infoItem.category ?? 'Uncategorized'}
                                    spacing={6}
                                />
                            ) : null}
                            {infoItem.amount && (
                                <MetaRow label="Amount" value={infoItem.amount} spacing={6} />
                            )}
                            <View style={styles.infoModalActions}>
                                <Button type="primary" size="sm" title="Close" onPress={() => setInfoItem(null)} />
                            </View>
                        </>
                    )}
                </View>
            </ModalDialog>

            <ModalPopover
                visible={viewMenuOpen}
                onClose={closeViewMenu}
                size="menu-wide"
                anchorRef={viewMenuAnchorRef}
                position="bottom-right"
            >
                {isGroceriesList ? (
                    <Pressable
                        style={styles.viewOption}
                        onPress={() => {
                            setViewMode('category');
                            closeViewMenu();
                        }}
                    >
                        <Text style={styles.viewOptionText}>By category</Text>
                    </Pressable>
                ) : null}
                <Pressable
                    style={styles.viewOption}
                    onPress={() => {
                        setViewMode('member');
                        closeViewMenu();
                    }}
                >
                    <Text style={styles.viewOptionText}>By family member</Text>
                </Pressable>
                <Pressable
                    style={styles.viewOption}
                    onPress={() => {
                        setViewMode('all');
                        closeViewMenu();
                    }}
                >
                    <Text style={styles.viewOptionText}>All items (A → Z)</Text>
                </Pressable>
            </ModalPopover>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screenContent: { paddingTop: 8, paddingHorizontal: 0, paddingBottom: 0 },

    page: {
        flex: 1,
        minHeight: 0,
        paddingLeft: 20,
        paddingRight: 16,
        paddingTop: 0,
        gap: 12,
    },

    toolbarRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    toolbarIcons: {
        flexShrink: 0,
        justifyContent: 'center',
    },
    tabsContainer: {
        width: '100%',
    },

    header: {
        paddingTop: 12,
        paddingBottom: 8,
        zIndex: 2,
    },
    actionsScroll: {
        flex: 1,
        minWidth: 0,
    },
    actionsScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingRight: 2,
        flexGrow: 0,
        minHeight: 36,
    },
    actionChip: {
        flexShrink: 0,
    },
    viewMenuAnchor: {
        flexShrink: 0,
        justifyContent: 'center',
    },
    viewOption: {
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    viewOptionText: {
        fontSize: 15,
        color: '#0f172a',
    },
    listScroll: {
        flex: 1,
        minHeight: 0,
    },

    listContent: {
        gap: 12,
        paddingBottom: 100,
    },
    listContentEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
        minHeight: 280,
    },

    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    emptyIcon: {
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#475569',
        textAlign: 'center',
        marginBottom: 6,
    },
    emptyHint: {
        fontSize: 15,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 22,
    },

    group: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 16,
        overflow: 'hidden',
    },

    groupTitleBar: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#f1f5f9',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    groupTitleText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    groupTitleMemberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    groupMemberAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#e2e8f0',
    },
    groupMemberAvatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupMemberAvatarInitial: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    groupTitleMemberName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    rowChecked: { backgroundColor: '#f5faff' },
    rowText: { fontSize: 16, color: '#0f172a' },
    rowTextDone: { color: '#64748b', textDecorationLine: 'line-through' },

    rowLine: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },

    amountPill: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: '#e2e8f0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    amountPillText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },

    infoModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 16,
    },
    infoModalActions: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },

    addTabTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 8,
    },
    addTabHint: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
        marginBottom: 10,
    },
    addTabActions: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
});
