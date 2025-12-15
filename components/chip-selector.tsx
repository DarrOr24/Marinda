// components/chip-selector.tsx
import React, { ReactNode } from 'react'
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native'

export interface ChipOption {
  label: string
  value: string
}

/** SINGLE SELECT MODE (default) */
interface SingleSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  multiple?: false
  allowDeselect?: boolean
}

/** MULTI SELECT MODE (optional) */
interface MultiSelectProps {
  values: string[]
  onChange: (values: string[]) => void
  multiple: true
}

type ChipSelectorProps = (SingleSelectProps | MultiSelectProps) & {
  options: ChipOption[]
  style?: StyleProp<ViewStyle>
  renderOption?: (opt: ChipOption, active: boolean) => ReactNode
  chipStyle?: (active: boolean, opt: ChipOption) => ViewStyle
  chipTextStyle?: (active: boolean, opt: ChipOption) => TextStyle
}

export function ChipSelector(props: ChipSelectorProps) {
  const { options, style, renderOption, chipStyle, chipTextStyle } = props
  const isMulti = props.multiple === true

  return (
    <View style={[styles.row, style]}>
      {options.map((opt) => {
        const active = isMulti
          ? props.values.includes(opt.value)
          : props.value === opt.value

        const customChipStyle = chipStyle?.(active, opt) ?? {}
        const customChipTextStyle = chipTextStyle?.(active, opt) ?? {}

        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (isMulti) {
                const already = props.values.includes(opt.value)
                props.onChange(
                  already
                    ? props.values.filter((v) => v !== opt.value)
                    : [...props.values, opt.value]
                )
              } else if (active && props.allowDeselect) {
                props.onChange(null)
              } else {
                props.onChange(opt.value)
              }
            }}
            style={[
              styles.chip,
              active && styles.chipActive,
              customChipStyle
            ]}
          >
            {renderOption ? (
              renderOption(opt, active)
            ) : (
              <Text
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                  customChipTextStyle
                ]}
              >
                {opt.label}
              </Text>
            )}
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
