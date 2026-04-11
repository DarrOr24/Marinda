import { MemberAvatar } from '@/components/avatar/member-avatar';
import { ChipSelector } from '@/components/chip-selector';
import { MembersSelector } from '@/components/members-selector';
import { ListExportMenuPopover } from '@/components/list-export-menu-popover';
import { MoveToTabModal } from '@/components/modals/move-to-tab-modal';
import { TodoItemModal } from '@/components/modals/todo-item-modal';
import { Button, MetaRow, ModalDialog, ModalPopover, Screen, TextInput } from '@/components/ui';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useRefById } from '@/hooks/use-ref-by-id';
import { useFamily } from '@/lib/families/families.hooks';
import { useFamilyListTabs } from '@/lib/lists/list-tabs.hooks';
import {
  DEFAULT_LIST_TAB_ID,
  DEFAULT_LIST_TABS,
  type ListTab,
  tabUsesListLevelSharing,
} from '@/lib/lists/list-tabs.types';
import {
  createListTab,
  mergeListTabShareMemberIds,
  replaceListTabShares,
} from '@/lib/lists/list-tabs.api';
import {
  listTabVisibleToMember,
  todoItemVisibleToActingMember,
} from '@/lib/lists/list-tab-visibility';
import { listTabsKey } from '@/lib/lists/list-tabs.hooks';
import {
  addTodoItem,
  deleteTodoItems,
  replaceTodoItemShares,
  updateTodoCompleted,
  updateTodoText,
  type TodoItemRow,
} from '@/lib/todos/todos.api';
import { sharePlainTextBulletList } from '@/lib/share/plain-text-list-share';
import { useFamilyTodoItems } from '@/lib/todos/todos.hooks';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
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
  list_kind: string;
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
    list_kind: r.list_kind?.trim() || DEFAULT_LIST_TAB_ID,
  };
}

export default function TodosBoard() {
  const router = useRouter();
  const {
    activeFamilyId,
    effectiveMember,
    family,
    members,
    isKidMode,
    hasParentPermissions,
  } = useAuthContext() as any;
  const viewMenuAnchorRef = useRef<View>(null);
  const toolbarListMenuAnchorRef = useRef<View>(null);
  const getTodoMenuAnchorRef = useRefById<View>();

  const { familyMembers } = useFamily(activeFamilyId);
  const { data: todoRows } = useFamilyTodoItems(activeFamilyId);
  const { data: listTabsData } = useFamilyListTabs(activeFamilyId);

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

  /** Full tab map from API (parent session in kid mode); used for item visibility checks. */
  const listTabById = useMemo(() => {
    const m = new Map<string, ListTab>();
    for (const t of listTabsData ?? []) m.set(t.id, t);
    return m;
  }, [listTabsData]);

  /**
   * RLS returns extra rows (e.g. parent can see all child-created tabs in SQL). Filter chips to what
   * **effectiveMember** should see: creator, list share, legacy unowned for parents, or item-share.
   */
  const customTabs = useMemo(() => {
    if (!listTabsData) return [];
    if (!myMemberId) return [];

    const tabById = new Map(listTabsData.map((t) => [t.id, t] as const));
    const visible = new Set<string>();
    const tabOpts = { includeLegacyUnownedForParent: hasParentPermissions };

    for (const t of listTabsData) {
      if (listTabVisibleToMember(t, myMemberId, tabOpts)) visible.add(t.id);
    }

    for (const row of todoRows ?? []) {
      const kind = row.list_kind?.trim() || DEFAULT_LIST_TAB_ID;
      if (kind === DEFAULT_LIST_TAB_ID) continue;
      const it = mapRow(row);
      if (todoItemVisibleToActingMember(it, tabById, myMemberId)) {
        visible.add(kind);
      }
    }

    return listTabsData.filter((t) => visible.has(t.id));
  }, [listTabsData, myMemberId, todoRows, hasParentPermissions]);

  const qc = useQueryClient();

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
  const [toolbarListMenuOpen, setToolbarListMenuOpen] = useState(false);

  const [items, setItems] = useState<TodoItem[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [infoItem, setInfoItem] = useState<TodoItem | null>(null);
  const [todoMenuItem, setTodoMenuItem] = useState<TodoItem | null>(null);
  const [moveTodoItem, setMoveTodoItem] = useState<TodoItem | null>(null);
  const [todoMovePending, setTodoMovePending] = useState(false);
  const [sharedVisibilityItem, setSharedVisibilityItem] = useState<TodoItem | null>(null);

  const [name, setName] = useState('');
  const [formListKind, setFormListKind] = useState<string>(DEFAULT_LIST_TAB_ID);
  const [listOpen, setListOpen] = useState(false);
  const [sharedMemberIds, setSharedMemberIds] = useState<string[]>([]);

  const [activeListKind, setActiveListKind] = useState<string>(DEFAULT_LIST_TAB_ID);
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState('');
  const [newTabShareMemberIds, setNewTabShareMemberIds] = useState<string[]>([]);
  const [creatingTab, setCreatingTab] = useState(false);

  const [listShareEditingTabId, setListShareEditingTabId] = useState<string | null>(null);
  const [listShareDraftIds, setListShareDraftIds] = useState<string[]>([]);
  const [listShareSaving, setListShareSaving] = useState(false);

  const ALL_TABS: ListTab[] = useMemo(
    () => [...DEFAULT_LIST_TABS, ...customTabs],
    [customTabs],
  );

  const tabIds = useMemo(() => ALL_TABS.map((t) => t.id), [ALL_TABS]);
  useEffect(() => {
    if (!tabIds.includes(activeListKind) && tabIds.length > 0) {
      setActiveListKind(tabIds[0]);
    }
  }, [tabIds, activeListKind]);

  const tabLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of ALL_TABS) m.set(t.id, t.label);
    return m;
  }, [ALL_TABS]);

  const activeTab = ALL_TABS.find((t) => t.id === activeListKind) ?? ALL_TABS[0];

  const activeTabUsesListSharing = tabUsesListLevelSharing(activeTab);
  const isCustomActiveList = activeListKind !== DEFAULT_LIST_TAB_ID;

  /** Names of everyone else on this shared list (excludes you) for banner copy. */
  const listSharePeerNamesForBanner = useMemo(() => {
    if (!activeTab?.shareMemberIds?.length) return '';
    const ids = myMemberId
      ? activeTab.shareMemberIds.filter((id) => id !== myMemberId)
      : activeTab.shareMemberIds;
    if (!ids.length) return '—';
    return ids.map((id) => nameForId(id)).join(', ');
  }, [activeTab, myMemberId, nameForId]);

  /** Parents may edit any custom list’s sharing; non-parents only if they created the list. */
  const canEditActiveListSharing = useMemo(() => {
    if (!activeTab || activeTab.id === DEFAULT_LIST_TAB_ID) return false;
    if (!myMemberId || myMemberId === 'guest') return false;
    if (hasParentPermissions) return true;
    return !!activeTab.created_by_member_id && activeTab.created_by_member_id === myMemberId;
  }, [activeTab, myMemberId, hasParentPermissions]);

  useEffect(() => {
    setItems([]);
  }, [activeFamilyId]);

  useEffect(() => {
    if (!todoRows) return;

    let mapped = todoRows.map((row) => mapRow(row));
    if (isKidMode) {
      mapped = myMemberId
        ? mapped.filter((item) => todoItemVisibleToActingMember(item, listTabById, myMemberId))
        : [];
    }

    setItems(mapped);
  }, [todoRows, isKidMode, myMemberId, listTabById]);

  /** Per-item “Also visible to” is hidden for list-level shared tabs; clear chips when switching list in the form. */
  useEffect(() => {
    const t = ALL_TABS.find((x) => x.id === formListKind);
    if (tabUsesListLevelSharing(t)) {
      setSharedMemberIds([]);
    }
  }, [formListKind, ALL_TABS]);

  useEffect(() => {
    setToolbarListMenuOpen(false);
  }, [activeListKind]);

  const itemsInTab = useMemo(
    () => items.filter((it) => it.list_kind === activeListKind),
    [items, activeListKind],
  );

  const allSorted = useMemo(() => {
    return [...itemsInTab].sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsInTab]);

  const groupedByMember = useMemo(() => {
    const map = new Map<string, TodoItem[]>();
    for (const it of itemsInTab) {
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
  }, [itemsInTab, nameForId]);

  async function handleCreateTab() {
    const trimmed = newTabLabel.trim();
    if (!trimmed || !activeFamilyId || !myMemberId || myMemberId === 'guest') return;

    setCreatingTab(true);
    try {
      const shareIds = mergeListTabShareMemberIds(myMemberId, newTabShareMemberIds);
      const tab = await createListTab({
        familyId: activeFamilyId,
        label: trimmed,
        createdByMemberId: myMemberId,
        ...(shareIds.length ? { shareMemberIds: shareIds } : {}),
      });
      await qc.invalidateQueries({ queryKey: listTabsKey(activeFamilyId) });
      setActiveListKind(tab.id);
      setShowAddTabModal(false);
      setNewTabLabel('');
      setNewTabShareMemberIds([]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create list.');
    } finally {
      setCreatingTab(false);
    }
  }

  function resetAddForm() {
    setName('');
    setFormListKind(activeListKind);
    setListOpen(false);
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

    const kind = formListKind.trim() || DEFAULT_LIST_TAB_ID;
    const kindTab = ALL_TABS.find((t) => t.id === kind);
    const listShared = tabUsesListLevelSharing(kindTab);

    if (editingItem) {
      const canEditShares = editingItem.created_by_member_id === myMemberId;
      try {
        const row = await updateTodoText(editingItem.id, trimmed, kind);
        const updated = mapRow(row);

        if (listShared) {
          await replaceTodoItemShares(editingItem.id, []);
          updated.shared_with_member_ids = [];
        } else if (canEditShares) {
          const shares = normalizedSharesForSave(
            editingItem.created_by_member_id,
            sharedMemberIds,
          );
          await replaceTodoItemShares(editingItem.id, shares);
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
        listKind: kind,
      });
      let next = mapRow(row);

      if (!listShared) {
        const shares = normalizedSharesForSave(myMemberId, sharedMemberIds);
        if (shares.length) {
          await replaceTodoItemShares(row.id, shares);
          next = { ...next, shared_with_member_ids: shares };
        }
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
    setFormListKind(item.list_kind);
    setListOpen(false);
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
                list_kind: mapped.list_kind ?? it.list_kind,
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
    const checked = itemsInTab.filter((i) => i.is_checked);
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
    const tab = ALL_TABS.find((t) => t.id === item.list_kind);
    if (tabUsesListLevelSharing(tab)) {
      const shared = [...new Set(tab!.shareMemberIds)];
      const rest = shared
        .filter((id) => id && id !== creator)
        .sort((a, b) => nameForId(a).localeCompare(nameForId(b)));
      if (!creator) return rest;
      return [creator, ...rest];
    }

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

  function openListShareEditor() {
    if (!canEditActiveListSharing || !activeTab || activeTab.id === DEFAULT_LIST_TAB_ID) return;
    const creatorId = activeTab.created_by_member_id ?? myMemberId;
    setListShareEditingTabId(activeTab.id);
    /** Edit “who else” — list creator is always implied; DB stores creator + others. */
    setListShareDraftIds(
      myMemberId
        ? activeTab.shareMemberIds.filter((id) => id !== creatorId)
        : [...activeTab.shareMemberIds],
    );
  }

  function exportActiveTodoList() {
    const lines = allSorted.map((it) => {
      const name = it.name.trim();
      if (!name) return '';
      return it.is_checked ? `${name} ✓` : name;
    });
    void sharePlainTextBulletList({
      title: activeTab.label,
      itemLines: lines,
      shareSheetTitle: activeTab.label,
    });
  }

  function commitListShareChanges() {
    if (!listShareEditingTabId || !activeFamilyId || !myMemberId) return;
    const tabMeta = ALL_TABS.find((t) => t.id === listShareEditingTabId);
    if (!tabMeta) return;
    const creatorId = tabMeta.created_by_member_id ?? myMemberId;
    const prev = new Set(tabMeta.shareMemberIds ?? []);
    const nextIds = mergeListTabShareMemberIds(creatorId, listShareDraftIds);
    const next = new Set(nextIds);
    const removed = [...prev].filter((id) => !next.has(id));

    const run = async () => {
      setListShareSaving(true);
      try {
        await replaceListTabShares(listShareEditingTabId, nextIds);
        await qc.invalidateQueries({ queryKey: listTabsKey(activeFamilyId) });
        setListShareEditingTabId(null);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not update list sharing.');
      } finally {
        setListShareSaving(false);
      }
    };

    if (removed.length) {
      Alert.alert(
        'Remove access?',
        `${removed.map((id) => nameForId(id)).join(', ')} will no longer see items on this list.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => void run() },
        ],
      );
    } else {
      void run();
    }
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
      sectionItems.some((it) => {
        if (!myMemberId) return false;
        const tab = ALL_TABS.find((t) => t.id === it.list_kind);
        if (tabUsesListLevelSharing(tab)) {
          return false;
        }
        return it.shared_with_member_ids.includes(myMemberId);
      });

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
    const rowListTab = ALL_TABS.find((t) => t.id === it.list_kind);
    const rowListUsesSharing = tabUsesListLevelSharing(rowListTab);
    const isSharee =
      !!myMemberId &&
      !isCreator &&
      (rowListUsesSharing
        ? rowListTab!.shareMemberIds.includes(myMemberId)
        : it.shared_with_member_ids.includes(myMemberId));
    const sharedByCreator =
      isCreator &&
      (rowListUsesSharing ? rowListTab!.shareMemberIds.length > 0 : it.shared_with_member_ids.length > 0);
    /** List-level shared lists: no per-row share icon (see banner). Item-level lists: icon when shared. */
    const showSharedIcon = !rowListUsesSharing && (sharedByCreator || isSharee);
    const sharedIconA11yLabel = sharedByCreator
      ? 'Shared with others'
      : isSharee
        ? 'Shared with you'
        : '';

    // In "by member" view, the section header already says who it’s from; everything there is shared.
    let contextHint: string | null = null;
    if (viewMode === 'all') {
      if (isSharee) {
        contextHint = rowListUsesSharing
          ? `${nameForId(it.created_by_member_id)} · shared list`
          : `${nameForId(it.created_by_member_id)} shared this with you`;
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

        <View ref={getTodoMenuAnchorRef(it.id)} collapsable={false}>
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
        </View>
      </Pressable>
    );
  }

  const shareContextTab = ALL_TABS.find(
    (t) => t.id === (editingItem?.list_kind ?? formListKind),
  );
  const editShowShare =
    (editingItem ? editingItem.created_by_member_id === myMemberId : true) &&
    !tabUsesListLevelSharing(shareContextTab);

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

            <View ref={toolbarListMenuAnchorRef} collapsable={false} style={styles.toolbarIcons}>
              <Button
                type="outline"
                size="sm"
                backgroundColor="#eef2ff"
                round
                hitSlop={8}
                title=""
                onPress={() => setToolbarListMenuOpen(true)}
                leftIcon={<MaterialCommunityIcons name="dots-vertical" size={20} />}
              />
            </View>
          </View>

          <View style={styles.tabsContainer}>
            <ChipSelector
              horizontal
              value={activeListKind}
              onChange={(val) => {
                if (!val) return;
                setActiveListKind(val);
              }}
              allowDeselect={false}
              options={ALL_TABS.map((t) => ({ label: t.label, value: t.id }))}
              chipStyle={(active) => ({
                backgroundColor: active ? '#eff6ff' : '#f9fafb',
                borderColor: active ? '#2563eb' : '#d4d4d4',
              })}
              chipTextStyle={(active) => ({
                color: active ? '#1d4ed8' : '#4b5563',
                fontWeight: active ? '600' : '500',
              })}
              trailingElement={
                <Button
                  type="outline"
                  size="sm"
                  backgroundColor="#eef2ff"
                  round
                  hitSlop={8}
                  title=""
                  leftIcon={<MaterialCommunityIcons name="plus" size={16} />}
                  style={styles.tabPlusBtn}
                  onPress={() => {
                    setNewTabLabel('');
                    setNewTabShareMemberIds([]);
                    setShowAddTabModal(true);
                  }}
                />
              }
            />
          </View>
        </View>

        {activeListKind === DEFAULT_LIST_TAB_ID ? (
          <View
            style={styles.sharedListBanner}
            accessible
            accessibilityLabel="This list is private. Share individual items when adding or editing."
          >
            <MaterialCommunityIcons
              name="account-multiple-outline"
              size={20}
              color="#64748b"
              style={styles.sharedListBannerIcon}
            />
            <View style={styles.sharedListBannerTextCol}>
              <Text style={styles.sharedListBannerTitle} numberOfLines={2}>
                Private list. Share items individually.
              </Text>
            </View>
          </View>
        ) : isCustomActiveList ? (
          <Pressable
            onPress={() => {
              if (canEditActiveListSharing) openListShareEditor();
            }}
            disabled={!canEditActiveListSharing}
            accessibilityRole={canEditActiveListSharing ? 'button' : 'text'}
            accessibilityLabel={
              canEditActiveListSharing
                ? activeTabUsesListSharing
                  ? `Shared list. Edit who can see this list. Currently: ${listSharePeerNamesForBanner}`
                  : 'This list is private. Edit who can see this list.'
                : activeTabUsesListSharing
                  ? `Shared list with ${listSharePeerNamesForBanner}`
                  : undefined
            }
            style={({ pressed }) => [
              styles.sharedListBanner,
              pressed && canEditActiveListSharing ? { opacity: 0.88 } : null,
              !canEditActiveListSharing && !activeTabUsesListSharing ? { opacity: 0.65 } : null,
            ]}
          >
            <MaterialCommunityIcons
              name="account-multiple-outline"
              size={20}
              color={activeTabUsesListSharing ? '#2563eb' : '#64748b'}
              style={styles.sharedListBannerIcon}
            />
            <View style={styles.sharedListBannerTextCol}>
              <Text style={styles.sharedListBannerTitle} numberOfLines={activeTabUsesListSharing ? 3 : 2}>
                {activeTabUsesListSharing
                  ? `Shared list · ${listSharePeerNamesForBanner}`
                  : canEditActiveListSharing || hasParentPermissions
                    ? 'This list is private.'
                    : 'Custom list'}
              </Text>
            </View>
            {canEditActiveListSharing ? (
              <MaterialCommunityIcons
                name="pencil-outline"
                size={18}
                color="#2563eb"
                style={styles.sharedListBannerEditIcon}
                importantForAccessibility="no"
              />
            ) : null}
          </Pressable>
        ) : null}

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[
            styles.listContent,
            itemsInTab.length === 0 && styles.listContentEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          scrollEnabled={
            !viewMenuOpen &&
            !toolbarListMenuOpen &&
            !todoMenuItem &&
            !sharedVisibilityItem &&
            !moveTodoItem &&
            !listShareEditingTabId
          }
        >
          {itemsInTab.length === 0 ? (
            <View style={styles.emptyState} accessibilityLabel="No items in this list. Tap Add.">
              <MaterialCommunityIcons
                name="format-list-checks"
                size={44}
                color="#cbd5e1"
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>Nothing here yet.</Text>
              <Text style={styles.emptyHint}>
                {items.length === 0
                  ? 'Tap Add to create an item.'
                  : `No items in “${activeTab.label}”. Tap Add or switch tab.`}
              </Text>
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
        tabs={ALL_TABS}
        listKind={formListKind}
        onChangeListKind={setFormListKind}
        listOpen={listOpen}
        onToggleListOpen={() => setListOpen((o) => !o)}
        showShare={editShowShare}
        sharedMemberIds={sharedMemberIds}
        onChangeSharedMemberIds={setSharedMemberIds}
        onCancel={() => {
          setAddOpen(false);
          resetAddForm();
        }}
        onSubmit={() => void saveItem()}
      />

      <ModalDialog visible={showAddTabModal} onClose={() => setShowAddTabModal(false)} size="md">
        <View>
          <Text style={styles.addTabTitle}>New list</Text>
          <Text style={styles.addTabHint}>
            Same items and checkboxes as To-dos. Optionally share the whole list so everyone chosen can
            see every item (you can still use per-item sharing on To-dos only).
          </Text>
          <TextInput
            placeholder="List name (e.g. Ideas)"
            value={newTabLabel}
            onChangeText={setNewTabLabel}
            containerStyle={{ marginBottom: 10 }}
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
          {myMemberId && myMemberId !== 'guest' ? (
            <View style={styles.newTabShareBlock}>
              <View style={styles.shareHeaderRow}>
                <MaterialCommunityIcons name="account-multiple-outline" size={18} color="#475569" />
                <Text style={styles.newTabShareLabel}>Share whole list with</Text>
              </View>
              <Text style={styles.newTabShareHint}>
                Leave empty for a normal list (use per-item sharing like To-dos). Anyone you add can
                see all items on this list.
              </Text>
              <MembersSelector
                values={newTabShareMemberIds}
                onChange={setNewTabShareMemberIds}
                containerStyle={{ marginTop: 6, marginBottom: 4 }}
              />
            </View>
          ) : null}
          <View style={styles.addTabActions}>
            <Button
              type="ghost"
              size="sm"
              title="Cancel"
              titleColor="#475569"
              onPress={() => setShowAddTabModal(false)}
            />
            <Button
              type="primary"
              size="sm"
              title={creatingTab ? '…' : 'Create'}
              disabled={!newTabLabel.trim() || creatingTab}
              onPress={() => void handleCreateTab()}
            />
          </View>
        </View>
      </ModalDialog>

      <ModalDialog
        visible={!!listShareEditingTabId}
        onClose={() => setListShareEditingTabId(null)}
        closeOnBackdropPress={!listShareSaving}
        size="lg"
        title="Who can see this list"
        scrollable
      >
        <View>
          <Text style={styles.listShareModalHint}>
            Everyone you select can view and check off every item on this list. To use per-item sharing
            instead, remove everyone here.
          </Text>
          <MembersSelector
            values={listShareDraftIds}
            onChange={setListShareDraftIds}
            containerStyle={{ marginTop: 8, marginBottom: 8 }}
          />
          <View style={styles.addTabActions}>
            <Button
              type="ghost"
              size="sm"
              title="Cancel"
              titleColor="#475569"
              disabled={listShareSaving}
              onPress={() => setListShareEditingTabId(null)}
            />
            <Button
              type="primary"
              size="sm"
              title={listShareSaving ? '…' : 'Save'}
              disabled={listShareSaving}
              onPress={() => commitListShareChanges()}
            />
          </View>
        </View>
      </ModalDialog>

      <ModalPopover
        visible={!!todoMenuItem}
        onClose={() => setTodoMenuItem(null)}
        anchorRef={getTodoMenuAnchorRef(todoMenuItem?.id ?? '')}
        position="bottom-right"
      >
        {todoMenuItem
          ? (() => {
              const item = todoMenuItem;
              const isCreator =
                !!myMemberId && item.created_by_member_id === myMemberId;
              const moveTargets = ALL_TABS.filter((t) => t.id !== item.list_kind);
              return (
                <>
                  {isCreator ? (
                    <Pressable
                      style={styles.todoMenuRow}
                      onPress={() => {
                        setTodoMenuItem(null);
                        startEdit(item);
                      }}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={18} color="#334155" />
                      <Text style={styles.todoMenuRowLabel}>Edit</Text>
                    </Pressable>
                  ) : null}
                  {isCreator && moveTargets.length > 0 ? (
                    <Pressable
                      style={styles.todoMenuRow}
                      onPress={() => {
                        setTodoMenuItem(null);
                        setMoveTodoItem(item);
                      }}
                    >
                      <MaterialCommunityIcons
                        name="folder-move-outline"
                        size={18}
                        color="#334155"
                      />
                      <Text style={styles.todoMenuRowLabel}>Move to tab…</Text>
                    </Pressable>
                  ) : null}
                  {isCreator ? <View style={styles.todoMenuDivider} /> : null}
                  <Pressable
                    style={styles.todoMenuRow}
                    onPress={() => {
                      setTodoMenuItem(null);
                      setInfoItem(item);
                    }}
                  >
                    <MaterialCommunityIcons name="information-outline" size={18} color="#334155" />
                    <Text style={styles.todoMenuRowLabel}>Details</Text>
                  </Pressable>
                </>
              );
            })()
          : null}
      </ModalPopover>

      <MoveToTabModal
        visible={!!moveTodoItem}
        onClose={() => {
          if (!todoMovePending) setMoveTodoItem(null);
        }}
        options={
          moveTodoItem
            ? ALL_TABS.filter((t) => t.id !== moveTodoItem.list_kind).map((t) => ({
                id: t.id,
                label: t.label,
              }))
            : []
        }
        busy={todoMovePending}
        onSelectOption={(tabId) => {
          const target = moveTodoItem;
          if (!target) return;
          setTodoMovePending(true);
          void (async () => {
            try {
              const row = await updateTodoText(target.id, target.name, tabId);
              let updated = mapRow(row);
              const destTab = ALL_TABS.find((t) => t.id === tabId);
              if (tabUsesListLevelSharing(destTab)) {
                await replaceTodoItemShares(target.id, []);
                updated = { ...updated, shared_with_member_ids: [] };
              }
              setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
              setMoveTodoItem(null);
              setActiveListKind(tabId);
            } catch (e) {
              console.error('move todo to tab failed', e);
              Alert.alert(
                'Error',
                e instanceof Error ? e.message : 'Could not move item.',
              );
            } finally {
              setTodoMovePending(false);
            }
          })();
        }}
      />

      <ModalDialog
        visible={!!sharedVisibilityItem}
        onClose={() => setSharedVisibilityItem(null)}
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
      </ModalDialog>

      <ModalDialog visible={!!infoItem} onClose={() => setInfoItem(null)} size="md">
        <View>
          {infoItem && (
            <>
              <Text style={styles.infoModalTitle}>{infoItem.name}</Text>
              {myMemberId && infoItem.created_by_member_id !== myMemberId ? (() => {
                const ilTab = ALL_TABS.find((t) => t.id === infoItem.list_kind);
                const listShared = tabUsesListLevelSharing(ilTab);
                const sharedWithMe = listShared
                  ? ilTab!.shareMemberIds.includes(myMemberId)
                  : infoItem.shared_with_member_ids.includes(myMemberId);
                if (!sharedWithMe) return null;
                return (
                  <Text style={styles.infoSharedBanner}>
                    {listShared
                      ? `${nameForId(infoItem.created_by_member_id)} · you’re on this shared list`
                      : `${nameForId(infoItem.created_by_member_id)} shared this with you`}
                  </Text>
                );
              })() : null}
              <MetaRow label="Created by" value={nameForId(infoItem.created_by_member_id)} spacing={6} />
              <MetaRow
                label="List"
                value={tabLabelById.get(infoItem.list_kind) ?? infoItem.list_kind}
                spacing={6}
              />
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
      </ModalDialog>

      <ModalPopover
        visible={viewMenuOpen}
        onClose={closeViewMenu}
        size="menu-wide"
        anchorRef={viewMenuAnchorRef}
        position="bottom-right"
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
      </ModalPopover>

      <ListExportMenuPopover
        visible={toolbarListMenuOpen}
        onClose={() => setToolbarListMenuOpen(false)}
        anchorRef={toolbarListMenuAnchorRef}
        onExportList={exportActiveTodoList}
        onOpenSettings={
          myMemberId && myMemberId !== 'guest'
            ? () => router.push('/lists/settings')
            : undefined
        }
      />
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
    marginBottom: 14,
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
  toolbarIcons: {
    flexShrink: 0,
    justifyContent: 'center',
  },
  tabsContainer: {
    width: '100%',
  },
  tabPlusBtn: {
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    alignSelf: 'center',
  },
  addTabTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  addTabHint: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  addTabActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  sharedListBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sharedListBannerIcon: {
    flexShrink: 0,
  },
  sharedListBannerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  sharedListBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 20,
  },
  sharedListBannerEditIcon: {
    flexShrink: 0,
    marginLeft: 4,
  },
  newTabShareBlock: {
    marginBottom: 10,
  },
  shareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newTabShareLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  newTabShareHint: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 2,
  },
  listShareModalHint: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 4,
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
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowChecked: { backgroundColor: '#f5faff' },
  /** Match MaterialCommunityIcons checkbox size (22) so first line lines up with the box. */
  rowText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#0f172a',
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  rowTextDone: { color: '#64748b', textDecorationLine: 'line-through' },

  rowTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  rowTitleFlex: {
    flex: 1,
    minWidth: 0,
  },
  rowSharedIconBtn: {
    flexShrink: 0,
    /** ~half of (rowText lineHeight 22 − icon 17) for optical alignment with first line */
    marginTop: 2,
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
