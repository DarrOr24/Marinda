// app/boards/announcements.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useAuthContext } from '@/hooks/use-auth-context';
import { useFamily } from '@/lib/families/families.hooks';

import {
    useCreateAnnouncement,
    useCreateAnnouncementTab,
    useDeleteAnnouncement,
    useFamilyAnnouncements,
    useFamilyAnnouncementTabs,
    useUpdateAnnouncement,
} from '@/lib/announcements/announcements.hooks';


import { ChipSelector } from '@/components/chip-selector';
import { Button } from '@/components/ui/button';
import { ModalCard } from '@/components/ui/modal-card';
import { ModalShell } from '@/components/ui/modal-shell';
import { ScreenList } from '@/components/ui/screen-list';
import {
    DEFAULT_ANNOUNCEMENT_TABS,
    type AnnouncementItem,
    type AnnouncementTab,
} from '@/lib/announcements/announcements.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --------------------------------------------
// Helper: Build a default placeholder
// --------------------------------------------
function buildDefaultPlaceholder(label: string) {
    return `Write a new ${label.trim()}...`;
}

// Helper
const shortId = (id?: string) => (id ? `ID ${String(id).slice(0, 6)}` : '—');

// --------------------------------------------
// MAIN COMPONENT
// --------------------------------------------
export default function AnnouncementsBoard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const INPUT_BAR_HEIGHT = 78;

    const { activeFamilyId, member, family, members } = useAuthContext() as any;
    const familyId = activeFamilyId ?? undefined;

    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'edited'>('newest');
    const [filterAuthor, setFilterAuthor] = useState<string>('all');

    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showAuthorMenu, setShowAuthorMenu] = useState(false);

    // --------------------------------------------
    // Load Members
    // --------------------------------------------
    const { familyMembers } = useFamily(familyId);

    const rawMembers: any[] = useMemo(
        () =>
            (familyMembers?.data ??
                members?.data ??
                members ??
                family?.members ??
                []) as any[],
        [familyMembers?.data, members, family]
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
                m?.name;
            map[id] = name || shortId(id);
        }
        return (id?: string) => (id ? map[id] || shortId(id) : '—');
    }, [rawMembers]);

    const authUserId: string | undefined =
        member?.profile?.id || member?.user_id || member?.profile_id;

    const myFamilyMemberId: string | undefined = useMemo(() => {
        const me = rawMembers.find(
            (m: any) =>
                m?.user_id === authUserId ||
                m?.profile?.id === authUserId ||
                m?.profile_id === authUserId
        );
        return me?.id as string | undefined;
    }, [member, rawMembers, authUserId]);

    // --------------------------------------------
    // Load Announcements + Realtime
    // --------------------------------------------
    const { data: announcements, isLoading, error } = useFamilyAnnouncements(familyId);

    const createMutation = useCreateAnnouncement(familyId);
    const deleteMutation = useDeleteAnnouncement(familyId);
    const updateMutation = useUpdateAnnouncement(familyId);

    // --------------------------------------------
    // Load Custom Tabs
    // --------------------------------------------
    const { data: customTabs = [] } = useFamilyAnnouncementTabs(familyId);
    const createTabMutation = useCreateAnnouncementTab(familyId);

    const ALL_TABS: AnnouncementTab[] = [...DEFAULT_ANNOUNCEMENT_TABS, ...customTabs];

    const [activeKind, setActiveKind] = useState<string>('free');
    const activeTab = ALL_TABS.find(t => t.id === activeKind) ?? ALL_TABS[0];

    // --------------------------------------------
    // UI State
    // --------------------------------------------
    const [newText, setNewText] = useState('');
    const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
    const [editText, setEditText] = useState('');

    const [showAddTabModal, setShowAddTabModal] = useState(false);
    const [newTabLabel, setNewTabLabel] = useState('');
    const [newTabPlaceholder, setNewTabPlaceholder] = useState('');

    // --------------------------------------------
    // SEARCH LOGIC
    // --------------------------------------------
    const isSearching = search.trim().length > 0;

    let filteredAnnouncements =
        (announcements ?? [])
            .map(a => ({
                ...a,
                created_by_name: nameForId(a.created_by_member_id),
            }))
            .filter(a => {
                if (isSearching) {
                    return (
                        a.text.toLowerCase().includes(search.toLowerCase()) ||
                        a.created_by_name.toLowerCase().includes(search.toLowerCase())
                    );
                }
                return a.kind === activeKind;
            });

    // AUTHOR FILTER
    if (filterAuthor !== 'all') {
        filteredAnnouncements = filteredAnnouncements.filter(
            a => a.created_by_name === filterAuthor
        );
    }

    // SORT
    if (sortBy === 'newest') {
        filteredAnnouncements.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    } else if (sortBy === 'oldest') {
        filteredAnnouncements.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    } else if (sortBy === 'edited') {
        filteredAnnouncements.sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }

    // --------------------------------------------
    // Add Announcement
    // --------------------------------------------
    function handleAdd() {
        if (!familyId || !myFamilyMemberId) return;

        const trimmed = newText.trim();
        if (!trimmed) return;

        // ✅ CLOSE keyboard immediately
        Keyboard.dismiss();

        createMutation.mutate(
            {
                familyId,
                createdByMemberId: myFamilyMemberId,
                kind: activeKind,
                text: trimmed,
                weekStart: null,
            },
            {
                onSuccess: () => setNewText(''),
                onError: err => Alert.alert('Error', (err as Error).message),
            }
        );
    }


    // --------------------------------------------
    // Delete
    // --------------------------------------------
    function handleDelete(item: AnnouncementItem) {
        deleteMutation.mutate(item.id, {
            onError: err => Alert.alert('Error', err.message),
        });
    }

    function confirmDelete(item: AnnouncementItem) {
        const canDelete =
            item.created_by_member_id === myFamilyMemberId ||
            member?.role === 'MOM' ||
            member?.role === 'DAD';

        if (!canDelete) {
            Alert.alert('Not allowed', 'You cannot delete this item.');
            return;
        }

        Alert.alert('Delete announcement?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDelete(item),
            },
        ]);
    }

    // --------------------------------------------
    // Render states
    // --------------------------------------------
    if (!familyId) {
        return (
            <View style={styles.center}>
                <Text style={styles.infoText}>Please select a family.</Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error.message}</Text>
            </View>
        );
    }

    // --------------------------------------------
    // MAIN RENDER
    // --------------------------------------------
    return (
        <ScreenList gap="md">
            <View style={styles.container}>
                {/* ---------------------------------------------- */}
                {/* ROW 1: SORT — BY — INFO */}
                {/* ---------------------------------------------- */}
                <View style={styles.sortInfoRow}>
                    <View style={styles.sortByGroup}>
                        <Button
                            type="outline"
                            size="sm"
                            backgroundColor="#eef2ff"
                            onPress={() => setShowSortMenu(true)}
                            title={`Sort: ${sortBy}`}
                        />

                        <Button
                            type="outline"
                            size="sm"
                            backgroundColor="#eef2ff"
                            onPress={() => setShowAuthorMenu(true)}
                            title={`By: ${filterAuthor === 'all' ? 'All' : filterAuthor}`}
                        />

                    </View>

                    <View style={styles.iconGroup}>
                        <Button
                            type="outline"
                            size="sm"
                            backgroundColor="#eef2ff"
                            round
                            hitSlop={8}
                            onPress={() => router.push('/boards/announcements-info')}
                            leftIcon={<Ionicons name="information-circle-outline" size={20} />}
                        />

                        <Button
                            type="outline"
                            size="sm"
                            backgroundColor="#eef2ff"
                            round
                            hitSlop={8}
                            onPress={() => router.push('/boards/announcements-settings')}
                            leftIcon={<Ionicons name="settings-outline" size={20} />}
                        />
                    </View>
                </View>

                {/* ---------------------------------------------- */}
                {/* ROW 2: SEARCH BAR WITH "X" CLEAR */}
                {/* ---------------------------------------------- */}
                <View style={styles.searchWrapper}>
                    <TextInput
                        style={[styles.textInput, styles.textInputWithRightIcon]}
                        placeholder="Search announcements..."
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={setSearch}
                    />

                    {search.length > 0 && (
                        <Pressable style={styles.clearSearchBtn} onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </Pressable>
                    )}
                </View>

                {/* ---------------------------------------------- */}
                {/* ROW 3: TABS + +ADD TAB */}
                {/* ---------------------------------------------- */}
                <View style={styles.tabsContainer}>
                    <View style={{ flex: 1 }}>
                        <ChipSelector
                            value={isSearching ? null : activeKind}
                            onChange={(val) => {
                                if (!val) return;
                                if (!isSearching) {
                                    setActiveKind(val);
                                    setNewText('');
                                }
                            }}
                            allowDeselect={false}
                            options={ALL_TABS.map((t) => ({ label: t.label, value: t.id }))}
                            chipStyle={(active) => ({
                                backgroundColor: active ? '#111827' : '#f9fafb',
                                borderColor: active ? '#111827' : '#d4d4d4',
                            })}
                            chipTextStyle={(active) => ({
                                color: active ? '#ffffff' : '#4b5563',
                                fontWeight: active ? '600' : '500',
                            })}
                        />
                    </View>

                    <View style={{ marginLeft: 8, alignSelf: 'flex-start' }}>
                        <Button
                            type="secondary"
                            size="sm"
                            title="+ Add Tab"
                            onPress={() => {
                                setNewTabLabel('');
                                setNewTabPlaceholder('');
                                setShowAddTabModal(true);
                            }}
                        />
                    </View>
                </View>


                {/* ---------------------------------------------- */}
                {/* ADD ANNOUNCEMENT INPUT */}
                {/* ---------------------------------------------- */}
                <View
                    style={[
                        styles.inputBar,
                        { paddingBottom: Platform.OS === 'android' ? 24 : 0 },
                    ]}
                >
                    <TextInput
                        style={[styles.textInput, styles.textInputMultiline]}
                        placeholder={activeTab.placeholder}
                        placeholderTextColor="#94a3b8"
                        value={newText}
                        onChangeText={setNewText}
                        multiline
                        numberOfLines={1}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />


                    <Button
                        title={createMutation.isPending ? '...' : 'Add'}
                        type="primary"
                        size="sm"
                        onPress={handleAdd}
                        disabled={!newText.trim() || createMutation.isPending}
                        style={{ alignSelf: 'flex-end' }}
                    />

                </View>

                {/* ---------------------------------------------- */}
                {/* LIST */}
                {/* ---------------------------------------------- */}
                <FlatList
                    style={{ flex: 1 }}
                    data={filteredAnnouncements}
                    keyExtractor={item => item.id}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
                    onScrollBeginDrag={Keyboard.dismiss}
                    contentContainerStyle={[
                        filteredAnnouncements.length === 0 ? styles.emptyList : undefined,
                        { paddingBottom: INPUT_BAR_HEIGHT + insets.bottom + 16 },
                    ]}
                    renderItem={({ item }) => (
                        <View style={styles.itemRow}>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemMeta}>
                                    {item.created_by_name} • {new Date(item.created_at).toLocaleString()}
                                </Text>

                                {item.created_at !== item.updated_at && (
                                    <Text style={styles.itemMeta}>
                                        (edited • {new Date(item.updated_at).toLocaleString()})
                                    </Text>
                                )}

                                <Text style={styles.itemText}>{item.text}</Text>

                                {item.completed && <Text style={styles.itemMeta}>✓ Completed</Text>}
                            </View>

                            {(item.created_by_member_id === myFamilyMemberId ||
                                member?.role === 'MOM' ||
                                member?.role === 'DAD') && (
                                    <Button
                                        type="ghost"
                                        size="sm"
                                        round
                                        hitSlop={10}
                                        titleColor="#475569"
                                        onPress={() => {
                                            setEditingItem(item);
                                            setEditText(item.text);
                                        }}
                                        title="✎"
                                    />

                                )}

                            <Button
                                type="ghost"
                                size="sm"
                                round
                                hitSlop={10}
                                titleColor="#b91c1c"
                                onPress={() => confirmDelete(item)}
                                title="✕"
                            />

                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.infoText}>{activeTab.emptyText}</Text>}
                />

                {/* ---------------------------------------------- */}
                {/* EDIT ANNOUNCEMENT MODAL (ModalShell + ModalCard) */}
                {/* ---------------------------------------------- */}
                <ModalShell
                    visible={!!editingItem}
                    onClose={() => setEditingItem(null)}
                    keyboardOffset={0}
                >
                    <ModalCard>
                        <Text style={styles.modalTitle}>Edit Announcement</Text>

                        <TextInput
                            style={[styles.textInput, styles.textInputMultiline]}
                            multiline
                            value={editText}
                            onChangeText={setEditText}
                            placeholder="Edit your note..."
                            placeholderTextColor="#94a3b8"
                        />

                        <View style={styles.modalButtons}>
                            <Button
                                type="ghost"
                                size="sm"
                                title="Cancel"
                                onPress={() => setEditingItem(null)}
                            />

                            <Button
                                type="primary"
                                size="sm"
                                title={updateMutation.isPending ? '...' : 'Save'}
                                disabled={!editText.trim() || updateMutation.isPending || !editingItem}
                                onPress={() => {
                                    if (!editingItem) return;

                                    updateMutation.mutate(
                                        { id: editingItem.id, updates: { text: editText.trim() } },
                                        {
                                            onSuccess: () => setEditingItem(null),
                                            onError: err => Alert.alert('Error', err.message),
                                        }
                                    );
                                }}
                            />
                        </View>
                    </ModalCard>
                </ModalShell>


                {/* ---------------------------------------------- */}
                {/* ADD TAB MODAL (ModalShell + ModalCard) */}
                {/* ---------------------------------------------- */}
                <ModalShell
                    visible={showAddTabModal}
                    onClose={() => setShowAddTabModal(false)}
                    keyboardOffset={0}
                >
                    <ModalCard>
                        <Text style={styles.modalTitle}>Create New Tab</Text>

                        <TextInput
                            style={styles.textInput}
                            placeholder="Tab name (e.g., Holidays)"
                            placeholderTextColor="#94a3b8"
                            value={newTabLabel}
                            onChangeText={setNewTabLabel}
                        />

                        <TextInput
                            style={[styles.textInput, styles.textInputMultiline]}
                            placeholder={
                                newTabLabel.trim()
                                    ? buildDefaultPlaceholder(newTabLabel)
                                    : 'Placeholder (optional)'
                            }
                            placeholderTextColor="#94a3b8"
                            value={newTabPlaceholder}
                            onChangeText={setNewTabPlaceholder}
                        />

                        <View style={styles.modalButtons}>
                            <Button
                                type="ghost"
                                size="sm"
                                title="Cancel"
                                onPress={() => setShowAddTabModal(false)}
                            />

                            <Button
                                type="primary"
                                size="sm"
                                title={createTabMutation.isPending ? '...' : 'Create'}
                                disabled={!newTabLabel.trim() || createTabMutation.isPending}
                                onPress={() => {
                                    const trimmed = newTabLabel.trim();
                                    if (!trimmed) return;

                                    const finalPlaceholder =
                                        newTabPlaceholder.trim() || buildDefaultPlaceholder(trimmed);

                                    createTabMutation.mutate(
                                        { familyId: familyId!, label: trimmed, placeholder: finalPlaceholder },
                                        {
                                            onSuccess: newTab => {
                                                setShowAddTabModal(false);
                                                setActiveKind(newTab.id);
                                            },
                                            onError: err => Alert.alert('Error', err.message),
                                        }
                                    );
                                }}
                            />
                        </View>
                    </ModalCard>
                </ModalShell>


                {/* ---------------------------------------------- */}
                {/* SORT MENU */}
                {/* ---------------------------------------------- */}
                {showSortMenu && (
                    <Pressable style={styles.modalOverlay} onPress={() => setShowSortMenu(false)}>
                        <Pressable style={styles.simpleMenu}>
                            {['newest', 'oldest', 'edited'].map(option => (
                                <Pressable
                                    key={option}
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setSortBy(option as any);
                                        setShowSortMenu(false);
                                    }}
                                >
                                    <Text style={styles.menuItemText}>{option}</Text>
                                </Pressable>
                            ))}
                        </Pressable>
                    </Pressable>
                )}

                {/* ---------------------------------------------- */}
                {/* AUTHOR MENU */}
                {/* ---------------------------------------------- */}
                {showAuthorMenu && (
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setShowAuthorMenu(false)}
                    >
                        <Pressable style={styles.simpleMenu}>
                            <Pressable
                                style={styles.menuItem}
                                onPress={() => {
                                    setFilterAuthor('all');
                                    setShowAuthorMenu(false);
                                }}
                            >
                                <Text style={styles.menuItemText}>All</Text>
                            </Pressable>

                            {rawMembers.map(m => {
                                const name =
                                    m?.nickname || m?.profile?.first_name || m?.name || shortId(m.id);

                                return (
                                    <Pressable
                                        key={m.id}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setFilterAuthor(name);
                                            setShowAuthorMenu(false);
                                        }}
                                    >
                                        <Text style={styles.menuItemText}>{name}</Text>
                                    </Pressable>
                                );
                            })}
                        </Pressable>
                    </Pressable>
                )}
            </View>
        </ScreenList>
    );
}

// --------------------------------------------
// STYLES
// --------------------------------------------
const styles = StyleSheet.create({
    container: { flex: 1, paddingLeft: 20, paddingRight: 16, paddingTop: 16, paddingBottom: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    infoText: { fontSize: 16, textAlign: 'center', opacity: 0.7 },
    errorText: { fontSize: 16, textAlign: 'center', color: 'red' },

    // --------------------------------------
    // SHARED INPUTS
    // --------------------------------------
    textInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#111827',
        marginBottom: 6,
    },

    textInputMultiline: {
        minHeight: 44,
        maxHeight: 120,
        textAlignVertical: 'top',
    },

    // used when you need space for the clear "X"
    textInputWithRightIcon: {
        paddingRight: 36,
    },


    // --------------------------------------
    // ROW 1: SORT — BY — INFO
    // --------------------------------------
    sortInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        width: '100%',
    },
    sortByGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },


    iconGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    // --------------------------------------
    // SEARCH BAR WITH CLEAR X
    // --------------------------------------
    searchWrapper: {
        position: 'relative',
        marginBottom: 4,
    },


    clearSearchBtn: {
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: [{ translateY: -10 }],
        padding: 4,
    },

    // --------------------------------------
    // TABS
    // --------------------------------------
    tabsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,

        width: '100%',
    },

    // --------------------------------------
    // LIST
    // --------------------------------------
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ddd',
        gap: 8,
    },
    itemTextContainer: { flex: 1 },
    itemText: { fontSize: 16 },
    itemMeta: { fontSize: 12, opacity: 0.6, marginTop: 2 },

    // --------------------------------------
    // ADD ANNOUNCEMENT
    // --------------------------------------
    inputBar: {
        paddingTop: 8,
        marginTop: 4,
    },

    // --------------------------------------
    // SHARED MODAL STYLES
    // --------------------------------------
    modalOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20,
    },

    // --------------------------------------
    // MENUS
    // --------------------------------------
    simpleMenu: {
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        width: 200,
    },
    menuItem: {
        paddingVertical: 8,
    },
    menuItemText: {
        fontSize: 16,
    },
});
