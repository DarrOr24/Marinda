import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { useAuthContext } from '@/hooks/use-auth-context';
import {
    useCreateAnnouncementTab,
    useDeleteAnnouncementTab,
    useFamilyAnnouncementTabs,
    useUpdateAnnouncementTab,
} from '@/lib/announcements/announcements.hooks';

import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { Screen } from '@/components/ui/screen';
import type { Role } from '@/lib/members/members.types';

export default function AnnouncementSettingsScreen() {

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
        <Screen gap="md" withBackground={false}>

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
                <Button
                    title="Add tab"
                    type="outline"
                    size="sm"
                    onPress={startAdd}
                    backgroundColor="#e0edff"
                    style={{ alignSelf: 'flex-start' }}
                />


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
                            <Button
                                title="Edit"
                                type="outline"
                                size="sm"
                                onPress={() => startEdit(t)}
                            />


                            <Button
                                title="Delete"
                                type="danger"
                                size="sm"
                                onPress={() => confirmDelete(t)}
                            />

                        </View>
                    </View>
                ))}

                {/* Editor panel */}
                {editing && (
                    <View style={styles.editorCard}>
                        <Text style={styles.editorTitle}>
                            {editing.id ? 'Edit tab' : 'Add new tab'}
                        </Text>

                        <TextInput
                            label="Name"
                            value={editing.label}
                            onChangeText={txt =>
                                setEditing(prev =>
                                    prev ? { ...prev, label: txt } : prev
                                )
                            }
                            placeholder="Holidays"
                        />

                        <TextInput
                            label="Input placeholder"
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
                            containerStyle={{ marginTop: 10 }}
                        />

                        <View style={styles.editorButtons}>
                            <Button
                                title="Cancel"
                                type="secondary"
                                size="md"
                                onPress={() => setEditing(null)}
                                fullWidth
                            />

                            <Button
                                title="Save"
                                type="primary"
                                size="md"
                                onPress={saveTab}
                                fullWidth
                                showShadow
                            />

                        </View>
                    </View>
                )}
            </Section>
        </Screen>

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
    editorButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
    },

    note: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 8,
    },

});
