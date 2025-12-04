import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthContext } from '@/hooks/use-auth-context';
import {
    useCreateAnnouncementTab,
    useDeleteAnnouncementTab,
    useFamilyAnnouncementTabs,
    useUpdateAnnouncementTab,
} from '@/lib/announcements/announcements.hooks';

import type { Role } from '@/lib/families/families.types';

export default function AnnouncementSettingsScreen() {
    const router = useRouter();

    const { activeFamilyId, member } = useAuthContext() as any;
    const currentRole = (member?.role as Role) ?? 'TEEN';
    const isParent = currentRole === 'MOM' || currentRole === 'DAD';

    const { data: tabs } = useFamilyAnnouncementTabs(activeFamilyId);

    const createTab = useCreateAnnouncementTab(activeFamilyId);
    const updateTab = useUpdateAnnouncementTab(activeFamilyId);
    const deleteTab = useDeleteAnnouncementTab(activeFamilyId);

    const [editing, setEditing] = useState<null | {
        id?: string;
        label: string;
        placeholder: string;
    }>(null);

    const requireParent = () => {
        if (!isParent) {
            Alert.alert(
                'Parents only',
                'Only parents can add, edit, or delete announcement tabs.'
            );
            return false;
        }
        return true;
    };

    /* --------------------------------------------------------
       Add tab
    --------------------------------------------------------- */
    const startAdd = () => {
        if (!requireParent()) return;

        setEditing({
            id: undefined,
            label: '',
            placeholder: '',
        });
    };

    /* --------------------------------------------------------
       Edit tab
    --------------------------------------------------------- */
    const startEdit = (t: any) => {
        if (!requireParent()) return;

        setEditing({
            id: t.id,
            label: t.label,
            placeholder: t.placeholder ?? '',
        });
    };

    /* --------------------------------------------------------
       Save tab
    --------------------------------------------------------- */
    const saveTab = async () => {
        if (!editing || !activeFamilyId) return;
        if (!requireParent()) return;

        const label = editing.label.trim();
        const placeholder = editing.placeholder.trim();

        if (!label) {
            Alert.alert('Add a name', 'Please enter a tab name.');
            return;
        }

        try {
            if (editing.id) {
                await updateTab.mutateAsync({
                    id: editing.id,
                    updates: {
                        label,
                        placeholder,
                    },
                });
            } else {
                await createTab.mutateAsync({
                    familyId: activeFamilyId,
                    label,
                    placeholder,
                });
            }

            setEditing(null);
        } catch (err) {
            console.error('Failed saving tab', err);
            Alert.alert('Error', 'Could not save this tab.');
        }
    };

    /* --------------------------------------------------------
       Delete tab
    --------------------------------------------------------- */
    const confirmDelete = (tab: any) => {
        if (!requireParent()) return;

        Alert.alert(
            'Delete tab?',
            `Are you sure you want to delete the "${tab.label}" tab?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTab.mutateAsync(tab.id);
                        } catch (err) {
                            console.error('Failed deleting tab', err);
                            Alert.alert('Error', 'Could not delete this tab.');
                        }
                    },
                },
            ]
        );
    };

    const customTabs = tabs ?? [];

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.header}>
                    Announcement Tabs Settings
                </Text>

                <Text style={styles.subtext}>
                    Organize which tabs appear in your announcement board.
                </Text>

                {/* Custom Tabs */}
                <Section title="Custom tabs">
                    <Text style={styles.description}>
                        Creating custom tabs helps you organize your family’s announcements in the way that works best for you.
                    </Text>

                    {!isParent && (
                        <Text style={styles.note}>
                            Only parents can add or edit custom tabs.
                        </Text>
                    )}

                    {/* Add button */}
                    <Pressable style={styles.addBtn} onPress={startAdd}>
                        <Text style={styles.addBtnText}>＋ Add tab</Text>
                    </Pressable>

                    {/* List custom tabs */}
                    {customTabs.map((t) => (
                        <View key={t.id} style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.tabLabel}>{t.label}</Text>
                                <Text style={styles.placeholderPreview}>
                                    Placeholder: {t.placeholder || '(none)'}
                                </Text>
                            </View>

                            <View style={styles.actions}>
                                <Pressable
                                    style={styles.smallChip}
                                    onPress={() => startEdit(t)}
                                >
                                    <Text style={styles.smallChipText}>Edit</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.smallChipDelete}
                                    onPress={() => confirmDelete(t)}
                                >
                                    <Text style={[styles.smallChipText, { color: '#b91c1c' }]}>
                                        Delete
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}

                    {/* Editor panel */}
                    {editing && (
                        <View style={styles.editorCard}>
                            <Text style={styles.editorTitle}>
                                {editing.id ? 'Edit tab' : 'Add new tab'}
                            </Text>

                            <Text style={styles.label}>Name</Text>
                            <TextInput
                                style={styles.input}
                                value={editing.label}
                                onChangeText={txt =>
                                    setEditing(prev =>
                                        prev ? { ...prev, label: txt } : prev
                                    )
                                }
                                placeholder="Holidays"
                            />

                            <Text style={[styles.label, { marginTop: 10 }]}>
                                Input placeholder
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={editing.placeholder}
                                onChangeText={txt =>
                                    setEditing(prev =>
                                        prev ? { ...prev, placeholder: txt } : prev
                                    )
                                }
                                placeholder={
                                    editing.label
                                        ? `Write a new ${editing.label.toLowerCase()}...`
                                        : 'Write a new announcement...'
                                }
                            />

                            <View style={styles.editorButtons}>
                                <Pressable
                                    style={[styles.smallBtn, styles.cancelBtn]}
                                    onPress={() => setEditing(null)}
                                >
                                    <Text style={styles.smallBtnText}>Cancel</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.smallBtn, styles.saveBtn]}
                                    onPress={saveTab}
                                >
                                    <Text style={[styles.smallBtnText, { color: '#fff' }]}>
                                        Save
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </Section>
            </ScrollView>
        </SafeAreaView>
    );
}

/* --------------------------------------------------------
   Helper Section Component
--------------------------------------------------------- */
function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

/* --------------------------------------------------------
   STYLES
--------------------------------------------------------- */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
    },
    subtext: {
        marginTop: 6,
        fontSize: 13,
        color: '#475569',
    },
    description: {
        fontSize: 13,
        color: '#475569',
        marginBottom: 8,
    },

    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginTop: 6,
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },

    tabLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
    },

    placeholderPreview: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },

    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    smallChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#f8fafc',
    },
    smallChipDelete: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#fecaca',
        backgroundColor: '#fee2e2',
    },
    smallChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#334155',
    },

    // Editor card
    editorCard: {
        marginTop: 20,
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    editorTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
        color: '#0f172a',
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
        marginTop: 4,
    },
    input: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 10,
        fontSize: 14,
        backgroundColor: '#fff',
    },

    editorButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
    },
    smallBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 999,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#e2e8f0',
    },
    saveBtn: {
        backgroundColor: '#2563eb',
    },
    smallBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },

    note: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 8,
    },

    addBtn: {
        marginTop: 8,
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: '#e0edff',
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1d4ed8',
    },
});
