import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

export type ThemedTextProps = TextProps & {
  variant?:
    | 'display'
    | 'title'
    | 'headline'
    | 'body'
    | 'bodySmall'
    | 'label'
    | 'caption'
    | 'micro'
    | 'link';
  tone?: 'default' | 'muted' | 'hint' | 'danger' | 'info' | 'success';
};

export function ThemedText({
  style,
  variant = 'body',
  tone = 'default',
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
                : theme.text

  return (
    <Text
      style={[
        { color },
        variant === 'display' ? styles.display : undefined,
        variant === 'title' ? styles.title : undefined,
        variant === 'headline' ? styles.headline : undefined,
        variant === 'body' ? styles.body : undefined,
        variant === 'bodySmall' ? styles.bodySmall : undefined,
        variant === 'label' ? styles.label : undefined,
        variant === 'caption' ? styles.caption : undefined,
        variant === 'micro' ? styles.micro : undefined,
        variant === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
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
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  micro: {
    fontSize: 12,
    lineHeight: 16,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
