import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { MemberAvatar } from '@/components/avatar/member-avatar'
import { Button, ModalDialog } from '@/components/ui'
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
    <ModalDialog visible={visible} onClose={onClose} size="md">
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

        <View style={styles.actions}>
          <Button title="Cancel" type="ghost" size="md" onPress={onClose} />
        </View>
      </View>
    </ModalDialog>
  )
}

const styles = StyleSheet.create({
  pickerModal: {
    gap: 12,
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
})
