import { MemberAvatar } from '@/components/avatar/member-avatar';
import { TodoItemModal } from '@/components/modals/todo-item-modal';
import { AppModal, Button, MetaRow, Screen } from '@/components/ui';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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

/** Kid mode keeps the parent's JWT; RLS also grants parents all child-created rows. Restrict to what the acting kid would see. */
function visibleToActingKid(it: TodoItem, actingMemberId: string): boolean {
  if (it.created_by_member_id === actingMemberId) return true;
  return it.shared_with_member_ids.includes(actingMemberId);
}

export default function TodosBoard() {
  const { activeFamilyId, effectiveMember, family, members, isKidMode } = useAuthContext() as any;
  const viewMenuAnchorRef = useRef<View>(null);

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

  const [viewMode, setViewMode] = useState<'member' | 'all'>('member');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const [items, setItems] = useState<TodoItem[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [infoItem, setInfoItem] = useState<TodoItem | null>(null);
  const [todoMenuItem, setTodoMenuItem] = useState<TodoItem | null>(null);
  const [sharedVisibilityItem, setSharedVisibilityItem] = useState<TodoItem | null>(null);

  const [name, setName] = useState('');
  const [sharedMemberIds, setSharedMemberIds] = useState<string[]>([]);

  const reloadItems = useCallback(async () => {
    if (!activeFamilyId) return;
    try {
      const rows = await fetchTodoItems(activeFamilyId);
      let mapped = rows.map((r) => mapRow(r));
      if (isKidMode) {
        mapped = myMemberId
          ? mapped.filter((it) => visibleToActingKid(it, myMemberId))
          : [];
      }
      setItems(mapped);
    } catch (e) {
      console.error('fetchTodoItems failed', e);
      Alert.alert('Error', 'Could not load to-dos.');
    }
  }, [activeFamilyId, isKidMode, myMemberId]);

  useEffect(() => {
    void reloadItems();
  }, [reloadItems]);

  const allSorted = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const groupedByMember = useMemo(() => {
    const map = new Map<string, TodoItem[]>();
    for (const it of items) {
      const key = it.created_by_member_id || '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return Array.from(map.entries()).sort(([idA], [idB]) =>
      nameForId(idA).localeCompare(nameForId(idB)),
    );
  }, [items, nameForId]);

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
    if (!myMemberId || item.created_by_member_id !== myMemberId) {
      Alert.alert(
        'View only',
        "Only the person who created this to-do can change the text or who it's shared with.",
      );
      return;
    }
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
    const checked = items.filter((i) => i.is_checked);
    if (!checked.length) {
      Alert.alert('Nothing selected', 'Check items to delete first.');
      return;
    }

    const deletable = myMemberId
      ? checked.filter((i) => i.created_by_member_id === myMemberId)
      : [];
    const skippedCount = checked.length - deletable.length;

    if (!deletable.length) {
      Alert.alert(
        "Can't delete these",
        skippedCount === 1
          ? 'This to-do was created by someone else. Only they can delete it.'
          : 'These to-dos were created by other people. Only they can delete them.',
      );
      return;
    }

    const deleteCount = deletable.length;
    const message =
      skippedCount > 0
        ? `Only to-dos you created can be removed. This deletes ${deleteCount} of yours. ${skippedCount} from others will stay on the list.`
        : deleteCount === 1
          ? 'This will remove the checked to-do.'
          : `This will remove ${deleteCount} checked to-dos.`;

    Alert.alert('Delete to-dos?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ids = deletable.map((i) => i.id);
          try {
            await deleteTodoItems(ids);
            setItems((prev) => prev.filter((it) => !ids.includes(it.id)));
          } catch (e) {
            console.error('deleteTodoItems failed', e);
            Alert.alert('Error', 'Could not delete items.');
          }
        },
      },
    ]);
  }

  /** Creator plus sharees; creator first, then others sorted by display name. */
  function visibleToMemberIds(item: TodoItem): string[] {
    const creator = item.created_by_member_id || '';
    const shared = [...new Set(item.shared_with_member_ids)];
    const rest = shared
      .filter((id) => id && id !== creator)
      .sort((a, b) => nameForId(a).localeCompare(nameForId(b)));
    if (!creator) return rest;
    return [creator, ...rest];
  }

  function visibleToSummary(item: TodoItem): string {
    const ids = visibleToMemberIds(item);
    if (ids.length === 0) return '—';
    return ids.map((id) => nameForId(id)).join(', ');
  }

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

  function renderMemberGroupHeader(memberId: string, sectionItems: TodoItem[]) {
    const label = nameForId(memberId);
    const isOthersSection = !!myMemberId && memberId !== myMemberId;
    const showSharedSubtitle =
      isOthersSection &&
      sectionItems.some((it) => myMemberId && it.shared_with_member_ids.includes(myMemberId));

    return (
      <View style={[styles.groupTitleBar, styles.groupTitleMemberRow]}>
        <MemberAvatar memberId={memberId} size="sm" />
        <View style={styles.groupHeaderTextCol}>
          <Text style={styles.groupTitleMemberName} numberOfLines={1}>
            {label}
          </Text>
          {showSharedSubtitle ? (
            <Text style={styles.groupSharedSubtitle} numberOfLines={1}>
              Shared with you
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  function renderRow(it: TodoItem) {
    const isCreator = !!myMemberId && it.created_by_member_id === myMemberId;
    const isSharee =
      !!myMemberId &&
      !isCreator &&
      it.shared_with_member_ids.includes(myMemberId);
    const sharedByCreator =
      isCreator && it.shared_with_member_ids.length > 0;
    /** Same icon for “I shared this” and “someone shared this with me” — quick scan in the list. */
    const showSharedIcon = sharedByCreator || isSharee;
    const sharedIconA11yLabel = sharedByCreator
      ? 'Shared with others'
      : isSharee
        ? 'Shared with you'
        : '';

    // In "by member" view, the section header already says who it’s from; everything there is shared.
    let contextHint: string | null = null;
    if (viewMode === 'all') {
      if (isSharee) {
        contextHint = `${nameForId(it.created_by_member_id)} shared this with you`;
      } else if (!isCreator) {
        contextHint = `From ${nameForId(it.created_by_member_id)}`;
      }
    }

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

        <View style={styles.rowTextBlock}>
          <View style={styles.rowLine}>
            <Text
              numberOfLines={1}
              style={[
                styles.rowText,
                it.is_checked && styles.rowTextDone,
                styles.rowTitleFlex,
              ]}
            >
              {it.name}
            </Text>
            {showSharedIcon ? (
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  setSharedVisibilityItem(it);
                }}
                style={({ pressed }) => [
                  styles.rowSharedIconBtn,
                  pressed && { opacity: 0.65 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Visible to. ${sharedIconA11yLabel}`}
              >
                <MaterialCommunityIcons
                  name="account-multiple-outline"
                  size={17}
                  color="#2563eb"
                  style={styles.rowSharedWithIcon}
                />
              </Pressable>
            ) : null}
          </View>
          {contextHint ? (
            <Text
              style={[styles.rowFromHint, isSharee && styles.rowSharedHint]}
              numberOfLines={viewMode === 'member' && isSharee ? 1 : 2}
            >
              {contextHint}
            </Text>
          ) : null}
        </View>

        <Pressable
          hitSlop={10}
          onPress={(e) => {
            e?.stopPropagation?.();
            setTodoMenuItem(it);
          }}
          style={({ pressed }) => [styles.rowMenuBtn, pressed && { opacity: 0.72 }]}
          accessibilityRole="button"
          accessibilityLabel="To-do actions"
        >
          <MaterialCommunityIcons name="dots-vertical" size={20} color="#475569" />
        </Pressable>
      </Pressable>
    );
  }

  const editShowShare = editingItem ? editingItem.created_by_member_id === myMemberId : true;

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
                rightIcon={<MaterialCommunityIcons name="checkbox-multiple-marked" size={18} />}
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
          </View>
        </View>

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[styles.listContent, items.length === 0 && styles.listContentEmpty]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          scrollEnabled={!viewMenuOpen && !todoMenuItem && !sharedVisibilityItem}
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
          ) : viewMode === 'member' ? (
            groupedByMember.map(([memberId, arr]) => (
              <View key={memberId} style={styles.group}>
                {renderMemberGroupHeader(memberId, arr)}
                {arr.map((it) => renderRow(it))}
              </View>
            ))
          ) : (
            <View style={styles.group}>{allSorted.map((it) => renderRow(it))}</View>
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

      <AppModal
        visible={!!todoMenuItem}
        statusBarTranslucent
        onClose={() => setTodoMenuItem(null)}
        avoidKeyboard={false}
        type="menu"
      >
        {todoMenuItem &&
        myMemberId &&
        todoMenuItem.created_by_member_id === myMemberId ? (
          <>
            <Pressable
              style={styles.todoMenuRow}
              onPress={() => {
                const item = todoMenuItem;
                setTodoMenuItem(null);
                startEdit(item);
              }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#334155" />
              <Text style={styles.todoMenuRowLabel}>Edit</Text>
            </Pressable>
            <View style={styles.todoMenuDivider} />
          </>
        ) : null}
        <Pressable
          style={styles.todoMenuRow}
          onPress={() => {
            const item = todoMenuItem;
            setTodoMenuItem(null);
            if (item) setInfoItem(item);
          }}
        >
          <MaterialCommunityIcons name="information-outline" size={18} color="#334155" />
          <Text style={styles.todoMenuRowLabel}>Details</Text>
        </Pressable>
      </AppModal>

      <AppModal
        visible={!!sharedVisibilityItem}
        onClose={() => setSharedVisibilityItem(null)}
        keyboardOffset={0}
        size="md"
      >
        <View>
          {sharedVisibilityItem ? (
            <>
              <Text style={styles.visibilityModalTitle}>Visible to</Text>
              <Text style={styles.visibilityModalSubtitle} numberOfLines={2}>
                {sharedVisibilityItem.name}
              </Text>
              <ScrollView
                style={styles.visibilityList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={visibleToMemberIds(sharedVisibilityItem).length > 6}
              >
                {visibleToMemberIds(sharedVisibilityItem).map((memberId) => {
                  const isSelf = !!myMemberId && memberId === myMemberId;
                  return (
                    <View key={memberId} style={styles.visibilityRow}>
                      <MemberAvatar memberId={memberId} size="sm" />
                      <Text style={styles.visibilityName} numberOfLines={1}>
                        {nameForId(memberId)}
                        {isSelf ? ' (you)' : ''}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.visibilityModalActions}>
                <Button
                  type="primary"
                  size="sm"
                  title="Close"
                  onPress={() => setSharedVisibilityItem(null)}
                />
              </View>
            </>
          ) : null}
        </View>
      </AppModal>

      <AppModal visible={!!infoItem} onClose={() => setInfoItem(null)} keyboardOffset={0} size="md">
        <View>
          {infoItem && (
            <>
              <Text style={styles.infoModalTitle}>{infoItem.name}</Text>
              {myMemberId &&
              infoItem.created_by_member_id !== myMemberId &&
              infoItem.shared_with_member_ids.includes(myMemberId) ? (
                <Text style={styles.infoSharedBanner}>
                  {nameForId(infoItem.created_by_member_id)} shared this with you
                </Text>
              ) : null}
              <MetaRow label="Created by" value={nameForId(infoItem.created_by_member_id)} spacing={6} />
              <MetaRow label="Visible to" value={visibleToSummary(infoItem)} spacing={6} />
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
        </View>
      </AppModal>

      <AppModal
        visible={viewMenuOpen}
        statusBarTranslucent
        onClose={closeViewMenu}
        avoidKeyboard={false}
        type="popover"
        size="menu-wide"
        position="top-right"
        anchorRef={viewMenuAnchorRef}
      >
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
      </AppModal>
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
    zIndex: 2,
  },
  toolbarRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 0,
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
  groupHeaderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  groupTitleMemberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  groupSharedSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
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

  rowTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitleFlex: {
    flex: 1,
    minWidth: 0,
  },
  rowSharedIconBtn: {
    flexShrink: 0,
    marginTop: 1,
    padding: 2,
    borderRadius: 6,
  },
  rowSharedWithIcon: {
    flexShrink: 0,
  },
  visibilityModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  visibilityModalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 14,
  },
  visibilityList: {
    maxHeight: 280,
    marginHorizontal: -4,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  visibilityName: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  visibilityModalActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rowFromHint: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  rowSharedHint: {
    color: '#2563eb',
    fontWeight: '600',
  },
  rowMenuBtn: {
    padding: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  todoMenuRowLabel: { fontSize: 16, color: '#0f172a' },
  todoMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 2,
    marginHorizontal: 10,
  },
  infoSharedBanner: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
    marginTop: -8,
    marginBottom: 14,
    lineHeight: 20,
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
