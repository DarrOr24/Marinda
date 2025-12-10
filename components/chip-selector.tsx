// components/chip-selector.tsx
import React from 'react'
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'

export interface ChipOption {
  label: string
  value: string
}

/** SINGLE SELECT MODE (default) */
interface SingleSelectProps {
  options: ChipOption[]
  value: string | null
  onChange: (value: string) => void
  style?: StyleProp<ViewStyle>

  multiple?: false
  values?: never
}

/** MULTI SELECT MODE (optional) */
interface MultiSelectProps {
  options: ChipOption[]
  values: string[]
  onChange: (values: string[]) => void
  style?: StyleProp<ViewStyle>

  multiple: true
  value?: never
}

type ChipSelectorProps = SingleSelectProps | MultiSelectProps

export function ChipSelector(props: ChipSelectorProps) {
  const { options, style } = props

  const isMulti = props.multiple === true

  return (
    <View style={[styles.row, style]}>
      {options.map((opt) => {
        const active = isMulti
          ? props.values.includes(opt.value)
          : props.value === opt.value

        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (isMulti) {
                const already = props.values.includes(opt.value)
                const next = already
                  ? props.values.filter((v) => v !== opt.value)
                  : [...props.values, opt.value]
                props.onChange(next)
              } else {
                props.onChange(opt.value)
              }
            }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, active && styles.chipTextActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  chipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  chipText: {
    fontSize: 13,
    color: '#4b5563',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
})
