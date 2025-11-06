import type { Member } from '@/lib/families/families.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function MemberAvatar({
  member,
  index = 0,
}: {
  member: Member
  index?: number
}) {
  const { iconName, iconColor, bgColor } = getStyleForMember(member, index)

  return (
    <View style={[styles.avatarCircle, { backgroundColor: bgColor }]}>
      <MaterialCommunityIcons name={iconName as any} size={30} color={iconColor} />
    </View>
  )
}


function getStyleForMember(m: Member, index: number) {
  const colorHex = m.color?.hex ?? '#2563eb'
  const iconColor = colorHex
  const bgColor = withAlpha(colorHex, 0.18)

  let iconName: string = 'account-outline'
  switch (m.role) {
    case 'MOM':
      iconName = 'face-woman'
      break
    case 'DAD':
      iconName = 'face-man'
      break
    case 'TEEN':
      iconName = 'emoticon-cool-outline'
      break
    case 'CHILD':
      iconName = 'baby-face-outline'
      break
    case 'ADULT':
    default:
      iconName = 'account-outline'
      break
  }

  return { iconName, iconColor, bgColor }
}


// Utility: add alpha channel to hex color (#rrggbb -> rgba-like transparency)
function withAlpha(hex: string, alpha = 0.15) {
  if (!/^#([0-9a-f]{6})$/i.test(hex)) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const styles = StyleSheet.create({
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

