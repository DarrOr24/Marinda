import { DocsPageLayout, DocsSection, docsPageStyles } from '@/components/docs-page-layout';
import { Button, TextInput } from '@/components/ui';
import { useAuthContext } from '@/hooks/use-auth-context';
import {
    deleteShoppingTab,
    fetchShoppingTabs,
    updateShoppingTab,
} from '@/lib/groceries/shopping-tabs.api';
import type { ShoppingTab } from '@/lib/groceries/shopping.types';
import { isParentRole } from '@/utils/validation.utils';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

export default function ShoppingListsSettingsScreen() {
    const { activeFamilyId, effectiveMember, authMember, isKidMode } = useAuthContext() as any;

    const myMemberId: string | undefined =
        effectiveMember?.id ?? effectiveMember?.member_id ?? undefined;

    /** Parent using their own profile (not acting as a child): rename/delete any custom list. In kid mode the session is still the parent, so we key off `isKidMode`. */
    const parentFullControl = isParentRole(authMember?.role) && !isKidMode;

    const [tabs, setTabs] = useState<ShoppingTab[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyTabId, setBusyTabId] = useState<string | null>(null);

    const canManageTab = useCallback(
        (t: ShoppingTab) => {
            if (!myMemberId) return false;
            if (parentFullControl) return true;
            if (t.created_by_member_id != null) return t.created_by_member_id === myMemberId;
            return false;
        },
        [myMemberId, parentFullControl],
    );

    const reload = useCallback(async () => {
        if (!activeFamilyId) {
            setTabs([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const list = await fetchShoppingTabs(activeFamilyId);
            setTabs(list);
        } catch (e) {
            console.error('fetchShoppingTabs', e);
            Alert.alert('Error', 'Could not load shopping lists.');
        } finally {
            setLoading(false);
        }
    }, [activeFamilyId]);

    useFocusEffect(
        useCallback(() => {
            void reload();
        }, [reload]),
    );

    const [editing, setEditing] = useState<null | { id: string; label: string }>(null);

    const startEdit = (t: ShoppingTab) => {
        if (!canManageTab(t)) {
            Alert.alert(
                'Not allowed',
                'You can only rename lists you created. Ask a parent to change other lists.',
            );
            return;
        }
        setEditing({ id: t.id, label: t.label });
    };

    const saveEdit = async () => {
        if (!editing) return;
        const label = editing.label.trim();
        if (!label) {
            Alert.alert('Name required', 'Enter a list name.');
            return;
        }
        setBusyTabId(editing.id);
        try {
            await updateShoppingTab(editing.id, { label });
            setEditing(null);
            await reload();
        } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not save.');
        } finally {
            setBusyTabId(null);
        }
    };

    const confirmDelete = (t: ShoppingTab) => {
        if (!canManageTab(t)) {
            Alert.alert(
                'Not allowed',
                'You can only delete lists you created. Ask a parent to remove other lists.',
            );
            return;
        }
        if (!activeFamilyId) return;

        Alert.alert(
            'Delete list?',
            `“${t.label}” and every item on it will be removed. This can’t be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setBusyTabId(t.id);
                        try {
                            await deleteShoppingTab(activeFamilyId, t.id);
                            await reload();
                        } catch (e) {
                            Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete.');
                        } finally {
                            setBusyTabId(null);
                        }
                    },
                },
            ],
        );
    };

    const footerNote = useMemo(() => {
        if (parentFullControl) return null;
        return (
            <Text style={[docsPageStyles.note, { marginTop: 10 }]}>
                You can rename or delete lists you added. Parents can manage every custom list.
            </Text>
        );
    }, [parentFullControl]);

    return (
        <DocsPageLayout intro="Rename or remove your family’s custom shopping lists. Open this from the Shopping board (settings icon on the top row). Groceries is always available and can’t be deleted. To add a new list, use the + button next to the list pills on the Shopping board. Examples of extra lists: online orders (e.g. Amazon), clothes, or school supplies.">
            <DocsSection title="Custom lists">
                <Text style={docsPageStyles.description}>
                    These lists appear as tabs on the Shopping board. Categories (produce, dairy, etc.)
                    only apply to the Groceries list. Use separate lists for things like school supplies,
                    birthday gifts, or a big trip—whatever fits your family. On the board, tap View to
                    switch layouts: by category (Groceries only), by who added each item, or one flat A→Z
                    list.
                </Text>

                {footerNote}

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 16 }} />
                ) : tabs.length === 0 ? (
                    <Text style={[docsPageStyles.description, { marginTop: 8 }]}>
                        No custom lists yet. Add one from the Shopping board.
                    </Text>
                ) : (
                    tabs.map((t) => (
                        <View key={t.id} style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.tabLabel}>{t.label}</Text>
                                {!canManageTab(t) && (
                                    <Text style={styles.readOnlyHint}>
                                        {t.created_by_member_id == null
                                            ? 'Ask a parent to rename or remove this list.'
                                            : 'Created by someone else.'}
                                    </Text>
                                )}
                            </View>
                            {canManageTab(t) && (
                                <View style={styles.actions}>
                                    <Button
                                        title="Rename"
                                        type="outline"
                                        size="sm"
                                        disabled={busyTabId !== null}
                                        onPress={() => startEdit(t)}
                                    />
                                    <Button
                                        title="Delete"
                                        type="danger"
                                        size="sm"
                                        disabled={busyTabId !== null}
                                        onPress={() => confirmDelete(t)}
                                    />
                                </View>
                            )}
                        </View>
                    ))
                )}

                {editing && (
                    <View style={styles.editorCard}>
                        <Text style={styles.editorTitle}>Rename list</Text>
                        <TextInput
                            label="Name"
                            value={editing.label}
                            onChangeText={(txt) => setEditing((prev) => (prev ? { ...prev, label: txt } : prev))}
                            placeholder="List name (e.g. Amazon)"
                            numberOfLines={1}
                            {...Platform.select({
                                ios: {
                                    adjustsFontSizeToFit: true,
                                    minimumFontScale: 0.72,
                                },
                                android: {
                                    maxFontSizeMultiplier: 2.35,
                                },
                                default: {},
                            })}
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
                                title={busyTabId ? '…' : 'Save'}
                                type="primary"
                                size="md"
                                onPress={() => void saveEdit()}
                                fullWidth
                                showShadow
                                disabled={!!busyTabId}
                            />
                        </View>
                    </View>
                )}
            </DocsSection>
        </DocsPageLayout>
    );
}

const styles = StyleSheet.create({
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
    readOnlyHint: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
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
    editorButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
    },
});
