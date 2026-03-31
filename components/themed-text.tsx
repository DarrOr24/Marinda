import { StyleSheet, Text, type TextProps } from 'react-native'

import { useTheme } from '@/providers/theme-provider'

export type ThemedTextProps = TextProps & {
  variant?:
  | 'display'
  | 'title'
  | 'headline'
  | 'body'
  | 'bodySmall'
  | 'bodyMicro'
  | 'label'
  | 'caption'
  | 'link'
  tone?: 'default' | 'muted' | 'hint' | 'danger' | 'info' | 'success'
  weight?: 'regular' | 'semibold' | 'bold'
}

export function ThemedText({
  style,
  variant = 'body',
  tone = 'default',
  weight,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme()
  const color =
    tone === 'muted'
      ? theme.textMuted
      : tone === 'hint'
        ? theme.hint
        : tone === 'danger'
          ? theme.dangerText
          : tone === 'info'
            ? theme.info
            : tone === 'success'
              ? theme.success
              : variant === 'link'
                ? theme.linkText
                : variant === 'bodySmall'
                  ? theme.textLighter1
                  : variant === 'bodyMicro'
                    ? theme.textLighter2
                    : theme.text
  const weightStyle =
    weight === 'regular'
      ? styles.weightRegular
      : weight === 'semibold'
        ? styles.weightSemibold
        : weight === 'bold'
          ? styles.weightBold
          : undefined

  return (
    <Text
      style={[
        { color },
        variant === 'display' ? styles.display : undefined,
        variant === 'title' ? styles.title : undefined,
        variant === 'headline' ? styles.headline : undefined,
        variant === 'body' ? styles.body : undefined,
        variant === 'bodySmall' ? styles.bodySmall : undefined,
        variant === 'bodyMicro' ? styles.bodyMicro : undefined,
        variant === 'label' ? styles.label : undefined,
        variant === 'caption' ? styles.caption : undefined,
        variant === 'link' ? styles.link : undefined,
        weightStyle,
        style,
      ]}
      {...rest}
    />
  )
}

const styles = StyleSheet.create({
  display: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  bodyMicro: {
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.72,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  weightRegular: {
    fontWeight: '400',
  },
  weightSemibold: {
    fontWeight: '600',
  },
  weightBold: {
    fontWeight: '700',
  },
})
