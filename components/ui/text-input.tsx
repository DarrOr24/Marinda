import React, { forwardRef } from 'react'
import {
  StyleProp,
  StyleSheet,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  ViewStyle,
} from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { useTheme } from '@/providers/theme-provider'

type TextInputProps = RNTextInputProps & {
  /** Optional label above the input */
  label?: string
  /** Multiline mode: taller minHeight, textAlignVertical top */
  multiline?: boolean
  /** Multiline with numberOfLines={1}: keep short row; minHeight comes from parent styles */
  multilineCompact?: boolean
  /** Override container style (e.g. marginTop) */
  containerStyle?: StyleProp<ViewStyle>
  /** RN documents as Android-only; not in current RN typings */
  includeFontPadding?: boolean
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    label,
    multiline,
    multilineCompact,
    containerStyle,
    style,
    placeholderTextColor,
    textAlignVertical: textAlignVerticalProp,
    ...props
  },
  ref
) {
  const theme = useTheme()

  return (
    <View style={containerStyle}>
      {label ? (
        <ThemedText variant="label" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <RNTextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor ?? theme.placeholder}
        style={[
          styles.input,
          {
            borderColor: theme.borderLight,
            color: theme.text,
            backgroundColor: theme.surface,
          },
          multiline &&
            (multilineCompact ? styles.multilineCompact : styles.multiline),
          style,
        ]}
        multiline={multiline}
        textAlignVertical={
          textAlignVerticalProp ?? (multiline ? 'top' : 'center')
        }
        {...props}
      />
    </View>
  )
})

TextInput.displayName = 'TextInput'

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 14,
  },
  multiline: {
    minHeight: 60,
    paddingTop: 10,
  },
  /** Same vertical rhythm as multiline, without forcing 60pt min height */
  multilineCompact: {
    paddingTop: 10,
  },
})
