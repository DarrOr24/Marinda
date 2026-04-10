import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RefObject } from 'react';
import {
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
  type View as RNView,
} from 'react-native';

import { ModalPopover } from '@/components/ui';

type ListExportMenuPopoverProps = {
  visible: boolean;
  onClose: () => void;
  anchorRef: RefObject<RNView | null>;
  onExportList: () => void;
  exportLabel?: string;
  onEdit?: () => void;
  editLabel?: string;
};

export function ListExportMenuPopover({
  visible,
  onClose,
  anchorRef,
  onExportList,
  exportLabel = 'Export list',
  onEdit,
  editLabel = 'Edit sharing',
}: ListExportMenuPopoverProps) {
  const showEdit = typeof onEdit === 'function';

  function runAfterPopoverDismiss(fn: () => void) {
    onClose();
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(fn);
    });
  }

  return (
    <ModalPopover visible={visible} onClose={onClose} anchorRef={anchorRef} position="bottom-right">
      {showEdit ? (
        <Pressable
          style={styles.row}
          onPress={() => {
            runAfterPopoverDismiss(() => {
              onEdit();
            });
          }}
        >
          <MaterialCommunityIcons name="pencil-outline" size={18} color="#334155" />
          <Text style={styles.rowLabel}>{editLabel}</Text>
        </Pressable>
      ) : null}
      {showEdit ? <View style={styles.divider} /> : null}
      <Pressable
        style={styles.row}
        onPress={() => {
          runAfterPopoverDismiss(() => {
            onExportList();
          });
        }}
      >
        <MaterialCommunityIcons name="tray-arrow-up" size={18} color="#334155" />
        <Text style={styles.rowLabel}>{exportLabel}</Text>
      </Pressable>
    </ModalPopover>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 16, color: '#0f172a' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 10,
  },
});
