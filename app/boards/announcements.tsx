// app/boards/announcements.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthContext } from '@/hooks/use-auth-context';
import { useFamily } from '@/lib/families/families.hooks';
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime';

import {
    useCreateAnnouncement,
    useCreateAnnouncementTab,
    useDeleteAnnouncement,
    useFamilyAnnouncements,
    useFamilyAnnouncementTabs,
    useUpdateAnnouncement,
} from '@/lib/announcements/announcements.hooks';

import { useAnnouncementsRealtime } from '@/lib/announcements/announcements.realtime';

import { Button } from '@/components/ui/button';
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
    useSubscribeTableByFamily('family_members', familyId, ['family-members', familyId]);

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
    const { data: announcements, isLoading, error } =
        useFamilyAnnouncements(familyId);

    useAnnouncementsRealtime(familyId);

    const createMutation = useCreateAnnouncement(familyId);
    const deleteMutation = useDeleteAnnouncement(familyId);
    const updateMutation = useUpdateAnnouncement(familyId);


    // --------------------------------------------
    // Load Custom Tabs
    // --------------------------------------------
    const { data: customTabs = [] } = useFamilyAnnouncementTabs(familyId);
    const createTabMutation = useCreateAnnouncementTab(familyId);

    const ALL_TABS: AnnouncementTab[] = [
        ...DEFAULT_ANNOUNCEMENT_TABS,
        ...customTabs,
    ];

    const [activeKind, setActiveKind] = useState<string>('free');
    const activeTab =
        ALL_TABS.find(t => t.id === activeKind) ?? ALL_TABS[0];


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
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
        );
    } else if (sortBy === 'oldest') {
        filteredAnnouncements.sort(
            (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
        );
    } else if (sortBy === 'edited') {
        filteredAnnouncements.sort(
            (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
        );
    }

    function closeInput() {
        Keyboard.dismiss();
    }

    // --------------------------------------------
    // Add Announcement
    // --------------------------------------------
    function handleAdd() {
        if (!familyId || !myFamilyMemberId) return;

        const trimmed = newText.trim();
        if (!trimmed) return;

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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    {/* ---------------------------------------------- */}
                    {/* ROW 1: SORT — BY — INFO */}
                    {/* ---------------------------------------------- */}
                    <View style={styles.sortInfoRow}>

                        <View style={styles.sortByGroup}>
                            <Pressable
                                style={styles.filterBtn}
                                onPress={() => setShowSortMenu(true)}
                            >
                                <Text style={styles.filterBtnLabel}>Sort: {sortBy}</Text>
                            </Pressable>

                            <Pressable
                                style={styles.filterBtn}
                                onPress={() => setShowAuthorMenu(true)}
                            >
                                <Text style={styles.filterBtnLabel}>
                                    By: {filterAuthor === 'all' ? 'All' : filterAuthor}
                                </Text>
                            </Pressable>
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
                            style={styles.searchInput}
                            placeholder="Search announcements..."
                            placeholderTextColor="#94a3b8"
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <Pressable
                                style={styles.clearSearchBtn}
                                onPress={() => setSearch('')}
                            >
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </Pressable>
                        )}
                    </View>


                    {/* ---------------------------------------------- */}
                    {/* ROW 3: TABS + +ADD TAB */}
                    {/* ---------------------------------------------- */}
                    <View style={styles.tabsContainer}>
                        {ALL_TABS.map(tab => {
                            const isActive = !isSearching && tab.id === activeKind;
                            return (
                                <Pressable
                                    key={tab.id}
                                    style={[styles.tab, isActive && styles.tabActive]}
                                    onPress={() => {
                                        if (!isSearching) {
                                            setActiveKind(tab.id);
                                            setNewText('');
                                        }
                                    }}
                                >
                                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                        {tab.label}
                                    </Text>
                                </Pressable>
                            );
                        })}

                        {/* ADD NEW TAB */}
                        <Pressable
                            style={styles.addTabBtn}
                            onPress={() => {
                                setNewTabLabel('');
                                setNewTabPlaceholder('');
                                setShowAddTabModal(true);
                            }}
                        >
                            <Text style={styles.addTabBtnText}>+ Add Tab</Text>
                        </Pressable>
                    </View>


                    {/* ---------------------------------------------- */}
                    {/* LIST */}
                    {/* ---------------------------------------------- */}
                    <FlatList
                        data={filteredAnnouncements}
                        keyExtractor={item => item.id}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={[
                            filteredAnnouncements.length === 0 ? styles.emptyList : undefined,
                            { paddingBottom: INPUT_BAR_HEIGHT + insets.bottom + 16, } // ⭐ Prevent Samsung nav bar + room for input
                        ]}
                        renderItem={({ item }) => (
                            <View style={styles.itemRow}>
                                <View style={styles.itemTextContainer}>
                                    <Text style={styles.itemMeta}>
                                        {item.created_by_name} •{' '}
                                        {new Date(item.created_at).toLocaleString()}
                                    </Text>

                                    {item.created_at !== item.updated_at && (
                                        <Text style={styles.itemMeta}>
                                            (edited • {new Date(item.updated_at).toLocaleString()})
                                        </Text>
                                    )}

                                    <Text style={styles.itemText}>{item.text}</Text>

                                    {item.completed && (
                                        <Text style={styles.itemMeta}>✓ Completed</Text>
                                    )}
                                </View>

                                {/* EDIT */}
                                {(item.created_by_member_id === myFamilyMemberId ||
                                    member?.role === 'MOM' ||
                                    member?.role === 'DAD') && (
                                        <Pressable
                                            style={styles.editBtn}
                                            onPress={() => {
                                                setEditingItem(item);
                                                setEditText(item.text);
                                            }}
                                        >
                                            <Text style={styles.deleteBtnText}>✎</Text>
                                        </Pressable>
                                    )}

                                {/* DELETE */}
                                <Pressable
                                    style={styles.deleteBtn}
                                    onPress={() => confirmDelete(item)}
                                >
                                    <Text style={styles.deleteBtnText}>✕</Text>
                                </Pressable>
                            </View>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.infoText}>{activeTab.emptyText}</Text>
                        }
                    />


                    {/* ---------------------------------------------- */}
                    {/* ADD ANNOUNCEMENT INPUT */}
                    {/* ---------------------------------------------- */}
                    <View
                        style={[
                            styles.inputBar,
                            { paddingBottom: Platform.OS === 'android' ? 24 : 0 }
                        ]}
                    >
                        <TextInput
                            style={styles.input}
                            placeholder={activeTab.placeholder}
                            placeholderTextColor="#94a3b8"
                            value={newText}
                            onChangeText={setNewText}
                            multiline
                            numberOfLines={1}                   // enables Samsung DONE/checkmark
                            returnKeyType="done"                // tells keyboard to show action key
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />

                        <Pressable
                            style={[
                                styles.addBtn,
                                (!newText.trim() || createMutation.isPending) &&
                                styles.addBtnDisabled,
                            ]}
                            onPress={handleAdd}
                            disabled={!newText.trim() || createMutation.isPending}
                        >
                            <Text style={styles.addBtnText}>
                                {createMutation.isPending ? '...' : 'Add'}
                            </Text>
                        </Pressable>
                    </View>


                    {/* ---------------------------------------------- */}
                    {/* EDIT ANNOUNCEMENT MODAL */}
                    {/* ---------------------------------------------- */}
                    {editingItem && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalBox}>
                                <Text style={styles.modalTitle}>Edit Announcement</Text>

                                <TextInput
                                    style={styles.modalInput}
                                    multiline
                                    value={editText}
                                    onChangeText={setEditText}
                                />

                                <View style={styles.modalButtons}>
                                    <Pressable onPress={() => setEditingItem(null)}>
                                        <Text style={styles.modalCancel}>Cancel</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => {
                                            updateMutation.mutate(
                                                {
                                                    id: editingItem.id,
                                                    updates: { text: editText.trim() },
                                                },
                                                {
                                                    onSuccess: () => setEditingItem(null),
                                                    onError: err =>
                                                        Alert.alert('Error', err.message),
                                                }
                                            );
                                        }}
                                    >
                                        <Text style={styles.modalSave}>Save</Text>
                                    </Pressable>
                                </View>

                            </View>
                        </View>
                    )}


                    {/* ---------------------------------------------- */}
                    {/* ADD TAB MODAL */}
                    {/* ---------------------------------------------- */}
                    {showAddTabModal && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalBox}>
                                <Text style={styles.modalTitle}>Create New Tab</Text>

                                {/* Label */}
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Tab name (e.g., Holidays)"
                                    placeholderTextColor="#94a3b8"
                                    value={newTabLabel}
                                    onChangeText={setNewTabLabel}
                                />

                                {/* Placeholder (auto default) */}
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder={
                                        newTabLabel.trim()
                                            ? buildDefaultPlaceholder(newTabLabel)
                                            : "Placeholder (optional)"
                                    }
                                    placeholderTextColor="#94a3b8"
                                    value={newTabPlaceholder}
                                    onChangeText={setNewTabPlaceholder}
                                />

                                <View style={styles.modalButtons}>
                                    <Pressable onPress={() => setShowAddTabModal(false)}>
                                        <Text style={styles.modalCancel}>Cancel</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => {
                                            const trimmed = newTabLabel.trim();
                                            if (!trimmed) return;

                                            const finalPlaceholder =
                                                newTabPlaceholder.trim() ||
                                                buildDefaultPlaceholder(trimmed);

                                            createTabMutation.mutate(
                                                {
                                                    familyId: familyId!,
                                                    label: trimmed,
                                                    placeholder: finalPlaceholder,
                                                },
                                                {
                                                    onSuccess: (newTab) => {
                                                        setShowAddTabModal(false);
                                                        setActiveKind(newTab.id);
                                                    },
                                                    onError: err =>
                                                        Alert.alert('Error', err.message),
                                                }
                                            );
                                        }}
                                    >
                                        <Text style={styles.modalSave}>
                                            {createTabMutation.isPending ? '...' : 'Create'}
                                        </Text>
                                    </Pressable>
                                </View>

                            </View>
                        </View>
                    )}


                    {/* ---------------------------------------------- */}
                    {/* SORT MENU */}
                    {/* ---------------------------------------------- */}
                    {showSortMenu && (
                        <Pressable
                            style={styles.modalOverlay}
                            onPress={() => setShowSortMenu(false)}
                        >
                            <Pressable style={styles.simpleMenu}>
                                {['newest', 'oldest', 'edited'].map(option => (
                                    <Pressable
                                        key={option}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setSortBy(option as any)
                                            setShowSortMenu(false)
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
                                        setFilterAuthor('all')
                                        setShowAuthorMenu(false)
                                    }}
                                >
                                    <Text style={styles.menuItemText}>All</Text>
                                </Pressable>

                                {rawMembers.map(m => {
                                    const name =
                                        m?.nickname ||
                                        m?.profile?.first_name ||
                                        m?.name ||
                                        shortId(m.id)

                                    return (
                                        <Pressable
                                            key={m.id}
                                            style={styles.menuItem}
                                            onPress={() => {
                                                setFilterAuthor(name)
                                                setShowAuthorMenu(false)
                                            }}
                                        >
                                            <Text style={styles.menuItemText}>{name}</Text>
                                        </Pressable>
                                    )
                                })}
                            </Pressable>
                        </Pressable>
                    )}


                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}


// --------------------------------------------
// STYLES
// --------------------------------------------
const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },

    screen: {
        flex: 1,
        backgroundColor: '#F7FBFF',
    },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    infoText: { fontSize: 16, textAlign: 'center', opacity: 0.7 },
    errorText: { fontSize: 16, textAlign: 'center', color: 'red' },


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
    filterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#eef2ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        marginRight: 6,
    },
    filterBtnLabel: {
        fontSize: 14,
        color: '#1e3a8a',
    },

    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    iconGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // PERFECT subtle spacing between icons
    },


    // --------------------------------------
    // SEARCH BAR WITH CLEAR X
    // --------------------------------------
    searchWrapper: {
        position: 'relative',
        marginBottom: 12,
    },

    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 12,
        paddingVertical: 8,
        paddingRight: 32, // space for X
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
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
        width: '100%',
    },

    tab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#d4d4d4',
        backgroundColor: '#f9fafb',
    },
    tabActive: {
        backgroundColor: '#111827',
        borderColor: '#111827',
    },
    tabLabel: { fontSize: 14, color: '#4b5563' },
    tabLabelActive: { color: 'white', fontWeight: '600' },

    addTabBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ccc',
    },
    addTabBtnText: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
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

    deleteBtn: { padding: 8, alignSelf: 'center' },
    deleteBtnText: { fontSize: 18, opacity: 0.6 },
    editBtn: { padding: 8, alignSelf: 'center' },


    // --------------------------------------
    // ADD ANNOUNCEMENT
    // --------------------------------------
    inputBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#ddd',
        paddingTop: 8,
        marginTop: 8,
    },
    input: {
        minHeight: 40,
        maxHeight: 120,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 8,
        textAlignVertical: 'top',
    },
    addBtn: {
        alignSelf: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#333',
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: { color: 'white', fontWeight: '600' },


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
    modalBox: {
        width: '85%',
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    modalInput: {
        minHeight: 40,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20,
    },
    modalCancel: { fontSize: 16, color: '#64748b' },
    modalSave: { fontSize: 16, color: '#2563eb', fontWeight: '700' },


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
