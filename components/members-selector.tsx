// components/members-selector.tsx
import React, { ReactNode, useMemo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle
} from 'react-native'

import { useAuthContext } from '@/hooks/use-auth-context'
import { useFamily } from '@/lib/families/families.hooks'
import type { Member } from '@/lib/families/families.types'
import { isKidRole, isParentRole } from '@/utils/validation.utils'
import { ChipSelector, type ChipOption } from './chip-selector'


function tint(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

type MultiMembersSelectorProps = {
  singleSelection?: false
  values: string[]
  onChange: (ids: string[]) => void
}

type SingleMembersSelectorProps = {
  singleSelection: true
  value: string | null
  onChange: (id: string | null) => void
}

export type MembersSelectorProps =
  | MultiMembersSelectorProps
  | SingleMembersSelectorProps


export function MembersSelector(props: MembersSelectorProps) {
  const { activeFamilyId } = useAuthContext() as any
  const { familyMembers } = useFamily(activeFamilyId)

  const memberList: Member[] = familyMembers.data ?? []

  const options = useMemo<ChipOption[]>(
    () =>
      memberList.map((m) => ({
        value: m.id,
        label:
          m.nickname ||
          m.profile?.first_name ||
          'Unknown',
      })),
    [memberList]
  )

  const membersById = useMemo(() => {
    const map: Record<string, Member> = {}
    memberList.forEach((m) => {
      map[m.id] = m
    })
    return map
  }, [memberList])

  if (familyMembers.isLoading || familyMembers.isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!memberList.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No family members yet</Text>
      </View>
    )
  }

  function chipStyle(active: boolean, opt: ChipOption): ViewStyle {
    const m = membersById[opt.value]
    const baseColor = m?.color?.hex || '#94a3b8'

    if (!active) return { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }
    return { borderColor: baseColor, backgroundColor: tint(baseColor, 0.12) }
  }

  function chipTextStyle(active: boolean, opt: ChipOption): TextStyle {
    const m = membersById[opt.value]
    const color = m?.color?.hex || '#1d4ed8'

    return active ? { color, fontWeight: '800' } : { color: '#0f172a' }
  }

  function renderOption(opt: ChipOption, active: boolean): ReactNode {
    const member = membersById[opt.value]
    const firstName =
      member?.nickname ||
      member?.profile?.first_name ||
      'Unknown'
    const dotColor = member?.color?.hex || '#94a3b8'

    return (
      <View style={styles.content}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text
          style={[
            styles.text,
            active && { color: dotColor },
          ]}
        >
          {firstName}
        </Text>
      </View>
    )
  }

  // 🔹 SINGLE SELECTION MODE (for chores, etc.)
  if (props.singleSelection) {
    const { value, onChange } = props

    return (
      <View style={styles.singleWrapper}>
        <ChipSelector
          options={options}
          value={value}
          onChange={onChange}
          allowDeselect
          chipStyle={chipStyle}
          chipTextStyle={chipTextStyle}
          renderOption={renderOption}
        />
      </View>
    )
  }

  // 🔹 MULTI SELECTION MODE (current behavior: All / Parents / Children)
  const { values, onChange } = props

  const allSelected =
    memberList.length > 0 && values.length === memberList.length

  const parentIds = useMemo(
    () => memberList.filter(m => isParentRole(m.role)).map(m => m.id),
    [memberList]
  )

  const childrenIds = useMemo(
    () => memberList.filter(m => isKidRole(m.role)).map(m => m.id),
    [memberList]
  )

  const parentsSelected =
    parentIds.length > 0 && parentIds.every(id => values.includes(id))

  const childrenSelected =
    childrenIds.length > 0 && childrenIds.every(id => values.includes(id))

  function handleToggleAll() {
    if (!memberList.length) return
    if (allSelected) onChange([])
    else onChange(memberList.map((m) => m.id))
  }

  function toggleGroup(ids: string[]) {
    if (!ids.length) return
    const allIn = ids.every(id => values.includes(id))

    if (allIn) {
      onChange(values.filter(v => !ids.includes(v)))
    } else {
      const next = Array.from(new Set([...values, ...ids]))
      onChange(next)
    }
  }

  function handleToggleParents() {
    toggleGroup(parentIds)
  }

  function handleToggleChildren() {
    toggleGroup(childrenIds)
  }

  return (
    <View style={styles.row}>
      {/* "Select All" chip */}
      <Pressable
        onPress={handleToggleAll}
        style={[
          styles.groupChip,
          allSelected && styles.groupChipActive,
        ]}
      >
        <Text
          style={[
            styles.groupText,
            allSelected && styles.groupTextActive,
          ]}
        >
          Select All
        </Text>
      </Pressable>

      {/* "Parents" chip */}
      <Pressable
        onPress={handleToggleParents}
        style={[
          styles.groupChip,
          parentsSelected && styles.groupChipActive,
        ]}
      >
        <Text
          style={[
            styles.groupText,
            parentsSelected && styles.groupTextActive,
          ]}
        >
          Parents
        </Text>
      </Pressable>

      {/* "Children" chip */}
      <Pressable
        onPress={handleToggleChildren}
        style={[
          styles.groupChip,
          childrenSelected && styles.groupChipActive,
        ]}
      >
        <Text
          style={[
            styles.groupText,
            childrenSelected && styles.groupTextActive,
          ]}
        >
          Children
        </Text>
      </Pressable>

      {/* Member chips */}
      <ChipSelector
        multiple
        options={options}
        values={values}
        onChange={onChange}
        chipStyle={chipStyle}
        chipTextStyle={chipTextStyle}
        renderOption={renderOption}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // shared
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  text: {
    color: '#0f172a',
    fontWeight: '800',
  },
  loadingContainer: {
    marginBlock: 8,
  },
  emptyContainer: {
    marginBlock: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },

  // single mode wrapper
  singleWrapper: {
    marginBlock: 8,
  },

  // multi mode layout
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBlock: 8,
  },

  // group chips (Select All / Parents / Children)
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  groupChipActive: {
    borderColor: '#2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  groupText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  groupTextActive: {
    color: '#2563eb',
  },
})
