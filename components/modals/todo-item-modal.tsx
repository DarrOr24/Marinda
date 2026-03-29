import { MembersSelector } from '@/components/members-selector';
import { AppModal, Button, TextInput, useModalScrollMaxHeight } from '@/components/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  mode: 'add' | 'edit';
  name: string;
  onChangeName: (v: string) => void;
  /** Creator-only: multi-select family members who may also see this to-do. */
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
  showShare,
  sharedMemberIds,
  onChangeSharedMemberIds,
  onCancel,
  onSubmit,
}: Props) {
  const scrollMaxHeight = useModalScrollMaxHeight(112);
  const title = mode === 'edit' ? 'Edit to-do' : 'Add to-do';
  const submitLabel = mode === 'edit' ? 'Save' : 'Add';

  return (
    <AppModal visible={visible} onClose={onCancel} keyboardOffset={12} size="lg">
      <Text style={styles.title}>{title}</Text>

      <ScrollView
        style={{ maxHeight: scrollMaxHeight }}
        contentContainerStyle={{ paddingBottom: 16, flexGrow: 0 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
      >
        <TextInput
          label="Task"
          value={name}
          onChangeText={onChangeName}
          placeholder="e.g., Call dentist"
          containerStyle={styles.fieldGap}
          autoFocus
        />

        {showShare ? (
          <View style={styles.fieldGap}>
            <View style={styles.shareHeader}>
              <MaterialCommunityIcons name="account-multiple-outline" size={18} color="#475569" />
              <Text style={styles.shareLabel}>Also visible to</Text>
            </View>
            <Text style={styles.shareHint}>
              Leave empty to keep this to-do private to you. Selected people can view and check it
              off.
            </Text>
            <MembersSelector
              values={sharedMemberIds}
              onChange={onChangeSharedMemberIds}
              containerStyle={{ marginTop: 6, marginBottom: 0 }}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Button type="outline" size="sm" title="Cancel" onPress={onCancel} />
        <Button type="primary" size="sm" title={submitLabel} onPress={onSubmit} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  fieldGap: {
    marginTop: 4,
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
