// app/boards/announcements.tsx
import React, { useMemo, useState } from 'react'
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
} from 'react-native'

import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import { useSubscribeTableByFamily } from '@/lib/families/families.realtime'

import {
    useCreateAnnouncement,
    useDeleteAnnouncement,
    useFamilyAnnouncements,
} from '@/lib/announcements/announcements.hooks'
import { useAnnouncementsRealtime } from '@/lib/announcements/announcements.realtime'

import {
    ANNOUNCEMENT_TABS,
    type AnnouncementItem,
    type AnnouncementTabId,
} from '@/lib/announcements/announcements.types'

// Small helper like Chores
const shortId = (id?: string) => (id ? `ID ${String(id).slice(0, 8)}` : '—')

export default function AnnouncementsBoard() {
    const { activeFamilyId, member, family, members } = useAuthContext() as any
    const familyId = activeFamilyId ?? undefined

    // -----------------------------
    // 1) LOAD MEMBERS (same as Chores)
    // -----------------------------
    const { members: membersQuery } = useFamily(familyId)
    useSubscribeTableByFamily('family_members', familyId, [
        'family-members',
        familyId,
    ])

    const rawMembers: any[] = useMemo(
        () =>
            (membersQuery?.data ??
                members?.data ??
                members ??
                family?.members ??
                []) as any[],
        [membersQuery?.data, members, family]
    )

    // Map memberId → display name
    const nameForId = useMemo(() => {
        const map: Record<string, string> = {}

        for (const m of rawMembers) {
            const id = m?.id ?? m?.member_id
            if (!id) continue

            const name =
                m?.nickname ||
                m?.profile?.first_name ||
                m?.first_name ||
                m?.profile?.name ||
                m?.name ||
                ''

            map[id] = name || shortId(id)
        }

        return (id?: string) => (id ? map[id] || shortId(id) : '—')
    }, [rawMembers])

    // Find logged-in member
    const authUserId: string | undefined =
        member?.profile?.id || member?.user_id || member?.profile_id

    const myFamilyMemberId: string | undefined = useMemo(() => {
        if (member?.id) return member.id as string

        const me = rawMembers.find(
            (m: any) =>
                m?.user_id === authUserId ||
                m?.profile?.id === authUserId ||
                m?.profile_id === authUserId
        )

        return me?.id as string | undefined
    }, [member, rawMembers, authUserId])

    // -----------------------------
    // 2) ANNOUNCEMENTS
    // -----------------------------
    const { data: announcements, isLoading, error } =
        useFamilyAnnouncements(familyId)

    useAnnouncementsRealtime(familyId)

    const createMutation = useCreateAnnouncement(familyId)
    const deleteMutation = useDeleteAnnouncement(familyId)

    // -----------------------------
    // 3) ACTIVE TAB
    // -----------------------------
    const [activeKind, setActiveKind] = useState<AnnouncementTabId>('free')
    const [newText, setNewText] = useState('')

    const activeTab =
        ANNOUNCEMENT_TABS.find(t => t.id === activeKind) ??
        ANNOUNCEMENT_TABS[ANNOUNCEMENT_TABS.length - 1]

    const filteredAnnouncements =
        (announcements ?? []).map(a => ({
            ...a,
            created_by_name: nameForId(a.created_by_member_id),
        })).filter(a => a.kind === activeKind)

    // -----------------------------
    // 4) ADD ANNOUNCEMENT
    // -----------------------------
    function handleAdd() {
        if (!familyId || !myFamilyMemberId) {
            Alert.alert('Missing family', 'Please select a family first.')
            return
        }

        const trimmed = newText.trim()
        if (!trimmed) return

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
                onError: err =>
                    Alert.alert('Error', (err as Error).message),
            }
        )
    }

    // -----------------------------
    // 5) DELETE ANNOUNCEMENT
    // -----------------------------
    function handleDelete(item: AnnouncementItem) {
        const canDelete =
            item.created_by_member_id === myFamilyMemberId ||
            member?.role === 'MOM' ||
            member?.role === 'DAD'

        if (!canDelete) {
            Alert.alert('Not allowed', 'You cannot delete this item.')
            return
        }

        deleteMutation.mutate(item.id, {
            onError: err =>
                Alert.alert('Error', (err as Error).message),
        })
    }

    // -----------------------------
    // 6) UI STATES
    // -----------------------------
    if (!familyId) {
        return (
            <View style={styles.center}>
                <Text style={styles.infoText}>
                    Please select a family to see announcements.
                </Text>
            </View>
        )
    }

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>
                    {(error as Error).message ??
                        'Failed to load announcements.'}
                </Text>
            </View>
        )
    }

    // -----------------------------
    // 7) RENDER
    // -----------------------------
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {ANNOUNCEMENT_TABS.map((tab) => {
                    const isActive = tab.id === activeKind
                    return (
                        <Pressable
                            key={tab.id}
                            style={[
                                styles.tab,
                                isActive && styles.tabActive,
                            ]}
                            onPress={() => {
                                setActiveKind(tab.id)
                                setNewText('')
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
                    )
                })}
            </View>

            {/* List */}
            <FlatList
                data={filteredAnnouncements}
                keyExtractor={(item) => item.id}
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
                                {new Date(item.created_at).toLocaleString()}
                            </Text>

                            <Text style={styles.itemText}>{item.text}</Text>

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

                        <Pressable
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(item)}
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

            {/* Input */}
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
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    center: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyList: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    infoText: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        color: 'red',
    },

    // Tabs
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
    tabLabel: {
        fontSize: 14,
        color: '#4b5563',
    },
    tabLabelActive: {
        color: 'white',
        fontWeight: '600',
    },

    // Items
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ddd',
        gap: 8,
    },
    itemTextContainer: {
        flex: 1,
    },
    itemText: {
        fontSize: 16,
    },
    itemMeta: {
        fontSize: 12,
        opacity: 0.6,
        marginTop: 2,
    },
    deleteBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'center',
    },
    deleteBtnText: {
        fontSize: 20,
        opacity: 0.6,
    },

    // Input
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
    addBtnDisabled: {
        opacity: 0.4,
    },
    addBtnText: {
        color: 'white',
        fontWeight: '600',
    },
})
