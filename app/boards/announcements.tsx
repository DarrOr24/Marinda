// app/boards/announcements.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useAuthContext } from '@/hooks/use-auth-context';
import { useFamily } from '@/lib/families/families.hooks';
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime';

import {
    useCreateAnnouncement,
    useDeleteAnnouncement,
    useFamilyAnnouncements,
    useUpdateAnnouncement,
} from '@/lib/announcements/announcements.hooks';
import { useAnnouncementsRealtime } from '@/lib/announcements/announcements.realtime';

import {
    ANNOUNCEMENT_TABS,
    type AnnouncementItem,
    type AnnouncementTabId,
} from '@/lib/announcements/announcements.types';

// Helper
const shortId = (id?: string) => (id ? `ID ${String(id).slice(0, 8)}` : '—');

export default function AnnouncementsBoard() {
    const router = useRouter();

    const { activeFamilyId, member, family, members } = useAuthContext() as any;
    const familyId = activeFamilyId ?? undefined;

    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] =
        useState<'newest' | 'oldest' | 'edited'>('newest');

    const [filterAuthor, setFilterAuthor] = useState<string>('all');

    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showAuthorMenu, setShowAuthorMenu] = useState(false);

    // -----------------------------
    // Load Members
    // -----------------------------
    const { members: membersQuery } = useFamily(familyId);
    useSubscribeTableByFamily('family_members', familyId, [
        'family-members',
        familyId,
    ]);

    const rawMembers: any[] = useMemo(
        () =>
            (membersQuery?.data ??
                members?.data ??
                members ??
                family?.members ??
                []) as any[],
        [membersQuery?.data, members, family]
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

    const authUserId: string | undefined =
        member?.profile?.id || member?.user_id || member?.profile_id;

    const myFamilyMemberId: string | undefined = useMemo(() => {
        if (member?.id) return member.id as string;

        const me = rawMembers.find(
            (m: any) =>
                m?.user_id === authUserId ||
                m?.profile?.id === authUserId ||
                m?.profile_id === authUserId
        );

        return me?.id as string | undefined;
    }, [member, rawMembers, authUserId]);

    // -----------------------------
    // Announcements
    // -----------------------------
    const { data: announcements, isLoading, error } =
        useFamilyAnnouncements(familyId);

    useAnnouncementsRealtime(familyId);

    const createMutation = useCreateAnnouncement(familyId);
    const deleteMutation = useDeleteAnnouncement(familyId);
    const updateMutation = useUpdateAnnouncement(familyId);

    // -----------------------------
    // Tabs + Editing
    // -----------------------------
    const [activeKind, setActiveKind] = useState<AnnouncementTabId>('free');
    const [newText, setNewText] = useState('');

    const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(
        null
    );
    const [editText, setEditText] = useState('');

    const activeTab =
        ANNOUNCEMENT_TABS.find(t => t.id === activeKind) ??
        ANNOUNCEMENT_TABS[ANNOUNCEMENT_TABS.length - 1];

    // ---------------------------------------------------------
    // 🚀 GLOBAL SEARCH LOGIC
    // ---------------------------------------------------------
    const isSearching = search.trim().length > 0;

    let filteredAnnouncements =
        (announcements ?? [])
            .map(a => ({
                ...a,
                created_by_name: nameForId(a.created_by_member_id),
            }))
            .filter(a => {
                // 🔍 GLOBAL SEARCH mode (ignore tab)
                if (isSearching) {
                    return (
                        a.text.toLowerCase().includes(search.toLowerCase()) ||
                        a.created_by_name
                            .toLowerCase()
                            .includes(search.toLowerCase())
                    );
                }

                // Normal tab filtering
                return a.kind === activeKind;
            });

    // AUTHOR FILTER
    if (filterAuthor !== 'all') {
        filteredAnnouncements = filteredAnnouncements.filter(
            a => a.created_by_name === filterAuthor
        );
    }

    // SORTING
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

    // -----------------------------
    // Add Announcement
    // -----------------------------
    function handleAdd() {
        if (!familyId || !myFamilyMemberId) return;

        const trimmed = newText.trim();
        if (!trimmed) return;

        createMutation.mutate(
            {
                familyId,
                createdByMemberId: myFamilyMemberId,
                kind: activeKind,
                category: null,
                text: trimmed,
                weekStart: null,
            },
            {
                onSuccess: () => setNewText(''),
                onError: err => Alert.alert('Error', (err as Error).message),
            }
        );
    }

    // -----------------------------
    // Delete
    // -----------------------------
    function handleDelete(item: AnnouncementItem) {
        deleteMutation.mutate(item.id, {
            onError: err => Alert.alert('Error', (err as Error).message),
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

    // -----------------------------
    // UI states
    // -----------------------------
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
                <Text style={styles.errorText}>
                    {(error as Error).message ?? 'Failed to load.'}
                </Text>
            </View>
        );
    }

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.select({ ios: 'padding', android: undefined })}
            >
                <View style={styles.headerLeft}>
                    <Pressable
                        onPress={() =>
                            router.push('/boards/announcements-info')
                        }
                        style={styles.iconCircle}
                        hitSlop={8}
                    >
                        <Ionicons
                            name="information-circle-outline"
                            size={18}
                            color="#1e3a8a"
                        />
                    </Pressable>
                </View>

                {/* SEARCH */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search announcements..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* FILTER ROW */}
                <View style={styles.filterRow}>
                    <Pressable
                        style={styles.filterBtn}
                        onPress={() => setShowSortMenu(true)}
                    >
                        <Text style={styles.filterBtnLabel}>
                            Sort: {sortBy}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={styles.filterBtn}
                        onPress={() => setShowAuthorMenu(true)}
                    >
                        <Text style={styles.filterBtnLabel}>
                            By:{' '}
                            {filterAuthor === 'all'
                                ? 'All'
                                : filterAuthor}
                        </Text>
                    </Pressable>
                </View>

                {/* TABS */}
                <View style={styles.tabsContainer}>
                    {ANNOUNCEMENT_TABS.map(tab => {
                        const isActive =
                            !isSearching && tab.id === activeKind;

                        return (
                            <Pressable
                                key={tab.id}
                                style={[
                                    styles.tab,
                                    isActive && styles.tabActive,
                                ]}
                                onPress={() => {
                                    if (!isSearching) {
                                        setActiveKind(tab.id);
                                        setNewText('');
                                    }
                                }}
                            >
                                <Text
                                    style={[
                                        styles.tabLabel,
                                        isActive && styles.tabLabelActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* LIST */}
                <FlatList
                    data={filteredAnnouncements}
                    keyExtractor={item => item.id}
                    contentContainerStyle={
                        filteredAnnouncements.length === 0
                            ? styles.emptyList
                            : undefined
                    }
                    renderItem={({ item }) => (
                        <View style={styles.itemRow}>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemMeta}>
                                    {item.created_by_name} •{' '}
                                    {new Date(
                                        item.created_at
                                    ).toLocaleString()}
                                </Text>

                                {item.updated_at !==
                                    item.created_at && (
                                        <Text style={styles.itemMeta}>
                                            (edited •{' '}
                                            {new Date(
                                                item.updated_at
                                            ).toLocaleString()}
                                            )
                                        </Text>
                                    )}

                                <Text style={styles.itemText}>
                                    {item.text}
                                </Text>

                                {item.week_start && (
                                    <Text style={styles.itemMeta}>
                                        Week of {item.week_start}
                                    </Text>
                                )}

                                {item.completed && (
                                    <Text style={styles.itemMeta}>
                                        ✓ Completed
                                    </Text>
                                )}
                            </View>

                            {(item.created_by_member_id ===
                                myFamilyMemberId ||
                                member?.role === 'MOM' ||
                                member?.role === 'DAD') && (
                                    <Pressable
                                        style={styles.editBtn}
                                        onPress={() => {
                                            setEditingItem(item);
                                            setEditText(item.text);
                                        }}
                                    >
                                        <Text style={styles.deleteBtnText}>
                                            ✎
                                        </Text>
                                    </Pressable>
                                )}

                            <Pressable
                                style={styles.deleteBtn}
                                onPress={() => confirmDelete(item)}
                            >
                                <Text style={styles.deleteBtnText}>✕</Text>
                            </Pressable>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={styles.infoText}>
                            {activeTab.emptyText}
                        </Text>
                    }
                />

                {/* ADD INPUT */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        placeholder={activeTab.placeholder}
                        value={newText}
                        onChangeText={setNewText}
                        multiline
                    />

                    <Pressable
                        style={[
                            styles.addBtn,
                            (!newText.trim() ||
                                createMutation.isPending) &&
                            styles.addBtnDisabled,
                        ]}
                        onPress={handleAdd}
                        disabled={
                            !newText.trim() || createMutation.isPending
                        }
                    >
                        <Text style={styles.addBtnText}>
                            {createMutation.isPending ? '...' : 'Add'}
                        </Text>
                    </Pressable>
                </View>

                {/* EDIT MODAL */}
                {editingItem && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalBox}>
                            <Text style={styles.modalTitle}>
                                Edit Announcement
                            </Text>

                            <TextInput
                                style={styles.modalInput}
                                multiline
                                value={editText}
                                onChangeText={setEditText}
                            />

                            <View style={styles.modalButtons}>
                                <Pressable
                                    onPress={() =>
                                        setEditingItem(null)
                                    }
                                >
                                    <Text style={styles.modalCancel}>
                                        Cancel
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => {
                                        updateMutation.mutate(
                                            {
                                                id: editingItem.id,
                                                updates: {
                                                    text: editText.trim(),
                                                },
                                            },
                                            {
                                                onSuccess: () =>
                                                    setEditingItem(
                                                        null
                                                    ),
                                                onError: err =>
                                                    Alert.alert(
                                                        'Error',
                                                        (
                                                            err as Error
                                                        ).message
                                                    ),
                                            }
                                        );
                                    }}
                                >
                                    <Text style={styles.modalSave}>
                                        Save
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )}

                {/* SORT MENU */}
                {showSortMenu && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.simpleMenu}>
                            {['newest', 'oldest', 'edited'].map(
                                option => (
                                    <Pressable
                                        key={option}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setSortBy(option as any);
                                            setShowSortMenu(false);
                                        }}
                                    >
                                        <Text
                                            style={
                                                styles.menuItemText
                                            }
                                        >
                                            {option}
                                        </Text>
                                    </Pressable>
                                )
                            )}
                        </View>
                    </View>
                )}

                {/* AUTHOR MENU */}
                {showAuthorMenu && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.simpleMenu}>
                            <Pressable
                                style={styles.menuItem}
                                onPress={() => {
                                    setFilterAuthor('all');
                                    setShowAuthorMenu(false);
                                }}
                            >
                                <Text style={styles.menuItemText}>
                                    All
                                </Text>
                            </Pressable>

                            {rawMembers.map(m => {
                                const name =
                                    m?.nickname ||
                                    m?.profile?.first_name ||
                                    m?.name ||
                                    shortId(m.id);

                                return (
                                    <Pressable
                                        key={m.id}
                                        style={
                                            styles.menuItem
                                        }
                                        onPress={() => {
                                            setFilterAuthor(
                                                name
                                            );
                                            setShowAuthorMenu(
                                                false
                                            );
                                        }}
                                    >
                                        <Text
                                            style={
                                                styles.menuItemText
                                            }
                                        >
                                            {name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    screen: {
        flex: 1,
        backgroundColor: '#F7FBFF',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
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

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    infoText: { fontSize: 16, textAlign: 'center', opacity: 0.7 },
    errorText: { fontSize: 16, textAlign: 'center', color: 'red' },

    tabsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
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
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20,
    },
    modalCancel: { fontSize: 16, color: '#64748b' },
    modalSave: { fontSize: 16, color: '#2563eb', fontWeight: '700' },

    searchContainer: {
        marginBottom: 10,
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },

    filterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#eef2ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },

    filterBtnLabel: {
        fontSize: 14,
        color: '#1e3a8a',
    },

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
