import { TodoItemModal } from '@/components/modals/todo-item-modal';
import { Button, MetaRow, ModalCard, ModalShell, Screen } from '@/components/ui';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useFamily } from '@/lib/families/families.hooks';
import {
  addTodoItem,
  deleteTodoItems,
  fetchTodoItems,
  replaceTodoItemShares,
  updateTodoCompleted,
  updateTodoText,
  type TodoItemRow,
} from '@/lib/todos/todos.api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

type TodoItem = {
  id: string;
  family_id: string;
  name: string;
  created_by_member_id: string;
  is_checked: boolean;
  checked_at?: string | null;
  created_at: string;
  shared_with_member_ids: string[];
};

const shortId = (id?: string) => (id ? `ID ${String(id).slice(0, 8)}` : '—');

function mapRow(r: TodoItemRow): TodoItem {
  const shares = r.todo_item_shares ?? [];
  return {
    id: r.id,
    family_id: r.family_id,
    name: r.text,
    created_by_member_id: r.created_by_member_id,
    is_checked: r.completed,
    checked_at: r.completed_at,
    created_at: r.created_at,
    shared_with_member_ids: shares.map((s) => s.member_id),
  };
}

export default function TodosBoard() {
  const { activeFamilyId, effectiveMember } = useAuthContext() as any;

  const { familyMembers } = useFamily(activeFamilyId);

  const rawMembers: any[] = useMemo(
    () => (familyMembers?.data ?? []) as any[],
    [familyMembers?.data],
  );

  const myMemberId: string | undefined =
    effectiveMember?.id ?? effectiveMember?.member_id ?? undefined;

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

  const [items, setItems] = useState<TodoItem[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [infoItem, setInfoItem] = useState<TodoItem | null>(null);

  const [name, setName] = useState('');
  const [sharedMemberIds, setSharedMemberIds] = useState<string[]>([]);

  const reloadItems = useCallback(async () => {
    if (!activeFamilyId) return;
    try {
      const rows = await fetchTodoItems(activeFamilyId);
      setItems(rows.map((r) => mapRow(r)));
    } catch (e) {
      console.error('fetchTodoItems failed', e);
      Alert.alert('Error', 'Could not load to-dos.');
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void reloadItems();
  }, [reloadItems]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  function resetAddForm() {
    setName('');
    setSharedMemberIds([]);
    setEditingItem(null);
  }

  function normalizedSharesForSave(createdBy: string, ids: string[]) {
    const set = new Set(ids);
    set.delete(createdBy);
    return [...set];
  }

  async function saveItem() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Missing task', 'Please enter a short description.');
      return;
    }

    if (!activeFamilyId || !myMemberId || myMemberId === 'guest') {
      Alert.alert('No member', 'Could not determine who is adding this to-do.');
      return;
    }

    const familyId = activeFamilyId;

    if (editingItem) {
      const showShare = editingItem.created_by_member_id === myMemberId;
      try {
        const row = await updateTodoText(editingItem.id, trimmed);
        const updated = mapRow(row);

        if (showShare) {
          await replaceTodoItemShares(
            editingItem.id,
            normalizedSharesForSave(editingItem.created_by_member_id, sharedMemberIds),
          );
          const shares = normalizedSharesForSave(
            editingItem.created_by_member_id,
            sharedMemberIds,
          );
          updated.shared_with_member_ids = shares;
        }

        setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
        setAddOpen(false);
        resetAddForm();
      } catch (e) {
        console.error('update todo failed', e);
        Alert.alert('Error', 'Could not update to-do.');
      }
      return;
    }

    try {
      const row = await addTodoItem({
        familyId,
        text: trimmed,
        createdByMemberId: myMemberId,
      });
      let next = mapRow(row);

      const shares = normalizedSharesForSave(myMemberId, sharedMemberIds);
      if (shares.length) {
        await replaceTodoItemShares(row.id, shares);
        next = { ...next, shared_with_member_ids: shares };
      }

      setItems((prev) => [next, ...prev]);
      setAddOpen(false);
      resetAddForm();
    } catch (e) {
      console.error('addTodoItem failed', e);
      const detail = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', `Could not add to-do.\n\n${detail}`);
    }
  }

  function startAdd() {
    resetAddForm();
    setAddOpen(true);
  }

  function startEdit(item: TodoItem) {
    setEditingItem(item);
    setName(item.name);
    setSharedMemberIds([...item.shared_with_member_ids]);
    setAddOpen(true);
  }

  async function toggleChecked(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const next = !target.is_checked;

    try {
      const row = await updateTodoCompleted(id, next);

      const mapped = mapRow(row);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                is_checked: mapped.is_checked,
                checked_at: mapped.checked_at,
              }
            : it,
        ),
      );
    } catch (e) {
      console.error('updateTodoCompleted failed', e);
      Alert.alert('Error', 'Could not update to-do.');
    }
  }

  function deleteChecked() {
    const checkedIds = items.filter((i) => i.is_checked).map((i) => i.id);
    if (!checkedIds.length) {
      Alert.alert('Nothing selected', 'Check items to delete first.');
      return;
    }

    Alert.alert('Delete completed to-dos?', 'This will remove all checked items.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTodoItems(checkedIds);
            setItems((prev) => prev.filter((it) => !checkedIds.includes(it.id)));
          } catch (e) {
            console.error('deleteTodoItems failed', e);
            Alert.alert('Error', 'Could not delete items.');
          }
        },
      },
    ]);
  }

  function shareSummary(item: TodoItem): string {
    if (!item.shared_with_member_ids.length) return 'Only you';
    return item.shared_with_member_ids.map((id) => nameForId(id)).join(', ');
  }

  function renderRow(it: TodoItem) {
    return (
      <Pressable
        key={it.id}
        onLongPress={() => setInfoItem(it)}
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
          <Text numberOfLines={1} style={[styles.rowText, it.is_checked && styles.rowTextDone]}>
            {it.name}
          </Text>
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
            setInfoItem(it);
          }}
        />
      </Pressable>
    );
  }

  const editShowShare = editingItem ? editingItem.created_by_member_id === myMemberId : true;

  return (
    <Screen scroll={false} withBackground={false} gap="no" contentStyle={styles.screenContent}>
      <View style={styles.page}>
        <View style={styles.header}>
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
              rightIcon={<MaterialCommunityIcons name="checkbox-multiple-marked" size={18} />}
              backgroundColor="#fff5f5"
              leftIconColor="#b91c1c"
              rightIconColor="#b91c1c"
              titleColor="#b91c1c"
            />
          </ScrollView>
        </View>

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[styles.listContent, items.length === 0 && styles.listContentEmpty]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {items.length === 0 ? (
            <View style={styles.emptyState} accessibilityLabel="No to-dos yet. Tap Add.">
              <MaterialCommunityIcons
                name="format-list-checks"
                size={44}
                color="#cbd5e1"
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>Nothing here yet.</Text>
              <Text style={styles.emptyHint}>Tap Add to create a to-do.</Text>
            </View>
          ) : (
            <View style={styles.group}>
              <View style={styles.groupTitleBar}>
                <Text style={styles.groupTitleText}>To-dos</Text>
              </View>
              {sortedItems.map((it) => renderRow(it))}
            </View>
          )}
        </ScrollView>
      </View>

      <TodoItemModal
        visible={addOpen}
        mode={editingItem ? 'edit' : 'add'}
        name={name}
        onChangeName={setName}
        showShare={editShowShare}
        sharedMemberIds={sharedMemberIds}
        onChangeSharedMemberIds={setSharedMemberIds}
        onCancel={() => {
          setAddOpen(false);
          resetAddForm();
        }}
        onSubmit={() => void saveItem()}
      />

      <ModalShell visible={!!infoItem} onClose={() => setInfoItem(null)} keyboardOffset={0}>
        <ModalCard>
          {infoItem && (
            <>
              <Text style={styles.infoModalTitle}>{infoItem.name}</Text>
              <MetaRow label="Created by" value={nameForId(infoItem.created_by_member_id)} spacing={6} />
              <MetaRow label="Visible to" value={shareSummary(infoItem)} spacing={6} />
              <MetaRow
                label="When"
                value={new Date(infoItem.created_at).toLocaleString()}
                spacing={6}
              />
              <View style={styles.infoModalActions}>
                <Button type="primary" size="sm" title="Close" onPress={() => setInfoItem(null)} />
              </View>
            </>
          )}
        </ModalCard>
      </ModalShell>
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

  header: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  actionsScroll: {
    flexGrow: 0,
  },
  actionsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 2,
    minHeight: 36,
  },
  actionChip: {
    flexShrink: 0,
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
});
