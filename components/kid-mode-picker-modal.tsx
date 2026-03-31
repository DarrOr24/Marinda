import React from 'react'
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import { MemberAvatar } from '@/components/avatar/member-avatar'
import { ThemedText } from '@/components/themed-text'
import { Button, ModalDialog } from '@/components/ui'
import type { FamilyMember } from '@/lib/members/members.types'
import { useTheme } from '@/providers/theme-provider'
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
  const theme = useTheme()

  return (
    <ModalDialog visible={visible} onClose={onClose} size="md">
      <View style={styles.pickerModal}>
        <ThemedText variant="title">
          Choose a kid
        </ThemedText>
        <ThemedText variant="bodySmall" tone="muted">
          Pick the profile to enter kid mode with.
        </ThemedText>

        <View style={styles.pickerList}>
          {members.map(member => (
            <TouchableOpacity
              key={member.id}
              style={[styles.pickerItem, { backgroundColor: theme.surfaceMuted }]}
              onPress={() => void onSelectMember(member.id)}
            >
              <MemberAvatar memberId={member.id} size="sm" isUpdatable={false} />
              <ThemedText variant="bodySmall" weight="semibold">
                {memberDisplayName(member)}
              </ThemedText>
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
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
})
