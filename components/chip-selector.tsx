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

interface ChipSelectorProps {
  options: ChipOption[]
  value: string | null
  onChange: (value: string) => void
  style?: StyleProp<ViewStyle>
}

export function ChipSelector({
  options,
  value,
  onChange,
  style,
}: ChipSelectorProps) {
  return (
    <View style={[styles.row, style]}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              active && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                active && styles.chipTextActive,
              ]}
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
