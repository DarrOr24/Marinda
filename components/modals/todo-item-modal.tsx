import { MembersSelector } from '@/components/members-selector';
import { Button, ModalDialog, TextInput } from '@/components/ui';
import type { ListTab } from '@/lib/lists/list-tabs.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  mode: 'add' | 'edit';
  name: string;
  onChangeName: (v: string) => void;
  /** Built-in + custom lists; `id` is `todo_items.list_kind`. */
  tabs: ListTab[];
  listKind: string;
  onChangeListKind: (v: string) => void;
  listOpen: boolean;
  onToggleListOpen: () => void;
  /** Creator-only: multi-select family members who may also see this item. */
  showShare: boolean;
  sharedMemberIds: string[];
  onChangeSharedMemberIds: (ids: string[]) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function TodoItemModal({
  visible,
  mode,
  name,
  onChangeName,
  tabs,
  listKind,
  onChangeListKind,
  listOpen,
  onToggleListOpen,
  showShare,
  sharedMemberIds,
  onChangeSharedMemberIds,
  onCancel,
  onSubmit,
}: Props) {
  const title = mode === 'edit' ? 'Edit item' : 'Add item';
  const submitLabel = mode === 'edit' ? 'Save' : 'Add';

  const listLabel = tabs.find((t) => t.id === listKind)?.label ?? 'Choose list';

  return (
    <ModalDialog visible={visible} onClose={onCancel} size="lg" title={title} scrollable>
      <View>
        <TextInput
          label="Item"
          value={name}
          onChangeText={onChangeName}
          placeholder="e.g., Call dentist"
          containerStyle={styles.fieldGap}
          autoFocus
        />

        <Text style={styles.labelText}>List</Text>
        <TouchableOpacity
          onPress={onToggleListOpen}
          style={styles.select}
          activeOpacity={0.8}
        >
          <Text style={styles.selectText}>{listLabel}</Text>
          <MaterialCommunityIcons name="menu-down" size={22} color="#334155" />
        </TouchableOpacity>

        {listOpen ? (
          <View style={styles.menu}>
            {tabs.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  onChangeListKind(t.id);
                  onToggleListOpen();
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {showShare ? (
          <View style={styles.shareBlock}>
            <View style={styles.shareHeader}>
              <MaterialCommunityIcons name="account-multiple-outline" size={18} color="#475569" />
              <Text style={styles.shareLabel}>Also visible to</Text>
            </View>
            <Text style={styles.shareHint}>
              Leave empty to keep this item private to you. Selected people can view and check it
              off.
            </Text>
            <MembersSelector
              values={sharedMemberIds}
              onChange={onChangeSharedMemberIds}
              containerStyle={{ marginTop: 6, marginBottom: 0 }}
            />
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button type="outline" size="sm" title="Cancel" onPress={onCancel} />
        <Button type="primary" size="sm" title={submitLabel} onPress={onSubmit} />
      </View>
    </ModalDialog>
  );
}

const styles = StyleSheet.create({
  fieldGap: {
    marginTop: 4,
  },
  labelText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  select: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: { color: '#0f172a', fontSize: 16 },
  menu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  menuItem: { paddingHorizontal: 12, paddingVertical: 10 },
  menuItemText: { color: '#0f172a', fontSize: 16 },
  shareBlock: {
    marginTop: 12,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  shareLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
  shareHint: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
});
