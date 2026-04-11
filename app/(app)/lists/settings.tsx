import { DocsPageLayout, DocsSection, docsPageStyles } from '@/components/docs-page-layout';
import { Button, TextInput } from '@/components/ui';
import { useAuthContext } from '@/hooks/use-auth-context';
import {
  deleteListTab,
  fetchListTabs,
  updateListTab,
} from '@/lib/lists/list-tabs.api';
import type { ListTab } from '@/lib/lists/list-tabs.types';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

export default function ListsSettingsScreen() {
  const { activeFamilyId, effectiveMember, hasParentPermissions } = useAuthContext() as any;

  const myMemberId: string | undefined =
    effectiveMember?.id ?? effectiveMember?.member_id ?? undefined;

  const [tabs, setTabs] = useState<ListTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTabId, setBusyTabId] = useState<string | null>(null);

  /**
   * Lists you can rename/delete here: ones you created, or legacy tabs (no stored creator) for parents only.
   * Shared lists created by someone else are managed on the board.
   */
  const ownTabs = useMemo(() => {
    if (!myMemberId) return [];
    return tabs.filter((t) => {
      if (t.created_by_member_id != null) return t.created_by_member_id === myMemberId;
      return hasParentPermissions;
    });
  }, [tabs, myMemberId, hasParentPermissions]);

  const reload = useCallback(async () => {
    if (!activeFamilyId) {
      setTabs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchListTabs(activeFamilyId);
      setTabs(list);
    } catch (e) {
      console.error('fetchListTabs', e);
      Alert.alert('Error', 'Could not load list categories.');
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

  const canManageTab = (t: ListTab) =>
    !!myMemberId &&
    (t.created_by_member_id === myMemberId || (t.created_by_member_id == null && hasParentPermissions));

  const startEdit = (t: ListTab) => {
    if (!canManageTab(t)) {
      Alert.alert('Not allowed', 'You can only rename lists you created.');
      return;
    }
    setEditing({ id: t.id, label: t.label });
  };

  const saveEdit = async () => {
    if (!editing || !myMemberId) return;
    const label = editing.label.trim();
    if (!label) {
      Alert.alert('Name required', 'Enter a list name.');
      return;
    }
    setBusyTabId(editing.id);
    try {
      await updateListTab(editing.id, { label });
      setEditing(null);
      await reload();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusyTabId(null);
    }
  };

  const confirmDelete = (t: ListTab) => {
    if (!canManageTab(t)) {
      Alert.alert('Not allowed', 'You can only delete lists you created.');
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
              await deleteListTab(activeFamilyId, t.id);
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

  return (
    <DocsPageLayout intro="Rename or remove custom list categories you created. Open this from the Lists board (settings on the top row). The “To-dos” tab is always there and can’t be deleted. Add more categories with the + button next to the tabs on the board. Items behave the same in every list: check off, share with family, and organize by member or A→Z from View.">
      <DocsSection title="Your custom lists">
        <Text style={docsPageStyles.description}>
          Use separate tabs for different kinds of checklist-style items—tasks, ideas, trip prep,
          anything that fits your family. Lists someone else created (and shared with you) don’t appear
          here; change sharing from the Lists board.
        </Text>

        {!myMemberId && (
          <Text style={docsPageStyles.note}>Sign in as a family member to manage your lists.</Text>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} />
        ) : ownTabs.length === 0 ? (
          <Text style={[docsPageStyles.description, { marginTop: 8 }]}>
            {myMemberId
              ? 'No custom lists you created yet. Add one from the Lists board.'
              : 'No custom lists yet.'}
          </Text>
        ) : (
          ownTabs.map((t) => (
            <View key={t.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tabLabel}>{t.label}</Text>
              </View>
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
