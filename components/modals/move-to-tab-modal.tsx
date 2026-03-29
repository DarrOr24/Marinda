import { ModalDialog } from '@/components/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type MoveToTabOption = { id: string; label: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Destination tabs only (caller should exclude the current tab). */
  options: MoveToTabOption[];
  onSelectOption: (tabId: string) => void;
  busy?: boolean;
  title?: string;
};

/**
 * Shared “Move to tab” sheet for Posts, Lists, and Shop. Uses `ModalDialog`’s
 * built-in scrollable body so the Cancel action is never clipped by nested
 * `maxHeight` / `ScrollView` flex issues.
 */
export function MoveToTabModal({
  visible,
  onClose,
  options,
  onSelectOption,
  busy = false,
  title = 'Move to tab',
}: Props) {
  return (
    <ModalDialog
      visible={visible}
      onClose={onClose}
      title={title}
      size="md"
      avoidKeyboard={false}
      scrollable
      closeOnBackdropPress={!busy}
    >
      <View style={styles.body}>
        {options.map((tab, index) => (
          <Pressable
            key={tab.id}
            style={[styles.row, index > 0 && styles.rowWithTopBorder]}
            onPress={() => onSelectOption(tab.id)}
            disabled={busy}
          >
            <Text style={styles.rowLabel}>{tab.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
          </Pressable>
        ))}
        <Pressable
          style={styles.cancelRow}
          onPress={onClose}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </ModalDialog>
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  rowWithTopBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  rowLabel: {
    fontSize: 16,
    color: '#0f172a',
    flex: 1,
  },
  cancelRow: {
    paddingVertical: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
});
