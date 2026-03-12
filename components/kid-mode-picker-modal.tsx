import React from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { MemberAvatar } from '@/components/avatar/member-avatar'
import type { FamilyMember } from '@/lib/members/members.types'
import { memberDisplayName } from '@/utils/format.utils'

type Props = {
  visible: boolean
  members: FamilyMember[]
  onClose: () => void
  onSelectMember: (memberId: string) => void | Promise<void>
}

export function KidModePickerModal({
  visible,
  members,
  onClose,
  onSelectMember,
}: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
      />

      <View style={styles.pickerModal}>
        <Text style={styles.pickerTitle}>Choose a kid</Text>
        <Text style={styles.pickerSubtitle}>Pick the profile to enter kid mode with.</Text>

        <View style={styles.pickerList}>
          {members.map(member => (
            <TouchableOpacity
              key={member.id}
              style={styles.pickerItem}
              onPress={() => void onSelectMember(member.id)}
            >
              <MemberAvatar memberId={member.id} size="sm" isUpdatable={false} />
              <Text style={styles.pickerItemText}>{memberDisplayName(member)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  pickerModal: {
    marginHorizontal: 20,
    marginTop: 'auto',
    marginBottom: 'auto',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  pickerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  pickerList: {
    gap: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  cancelButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
})
