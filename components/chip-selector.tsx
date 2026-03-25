// components/chip-selector.tsx
import React, { ReactNode } from 'react'
import {
  Pressable,
  ScrollView,
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
  /** Renders after chips, flows in same row when space allows */
  trailingElement?: ReactNode
  /** Single horizontal row with horizontal scroll when chips overflow (no wrapping). */
  horizontal?: boolean
}

export function ChipSelector(props: ChipSelectorProps) {
  const {
    options,
    style,
    renderOption,
    chipStyle,
    chipTextStyle,
    trailingElement,
    horizontal,
  } = props
  const isMulti = props.multiple === true

  const chips = options.map((opt) => {
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
          horizontal && styles.chipHorizontal,
          active && styles.chipActive,
          customChipStyle,
        ]}
      >
        {renderOption ? (
          renderOption(opt, active)
        ) : (
          <Text
            style={[
              styles.chipText,
              active && styles.chipTextActive,
              customChipTextStyle,
            ]}
          >
            {opt.label}
          </Text>
        )}
      </Pressable>
    )
  })

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.horizontalScroll, style]}
        contentContainerStyle={styles.horizontalScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {chips}
        {trailingElement != null ? (
          <View style={styles.trailingHorizontal}>{trailingElement}</View>
        ) : null}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.row, style]}>
      {chips}
      {trailingElement}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  horizontalScroll: {
    flexGrow: 0,
    width: '100%',
  },
  horizontalScrollContent: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  chipHorizontal: {
    flexShrink: 0,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  trailingHorizontal: {
    flexShrink: 0,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
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
