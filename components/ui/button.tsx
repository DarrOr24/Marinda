// components/ui/button.tsx
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
  useColorScheme,
} from 'react-native';

import { Colors } from '@/config/colors';


export type ButtonType = 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title: string;
  type?: ButtonType;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  showShadow?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  type = 'primary',
  size = 'md',
  onPress,
  disabled = false,
  fullWidth = false,
  showShadow = false,
  style,
}: ButtonProps) {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? Colors.dark : Colors.light;

  const isPrimary = type === 'primary';

  const backgroundColor = isPrimary
    ? theme.primaryBackground
    : theme.secondaryBackground;

  const textColor = isPrimary
    ? theme.primaryText
    : theme.secondaryText;

  const sizeStyle =
    size === 'sm'
      ? styles.sizeSm
      : size === 'lg'
        ? styles.sizeLg
        : styles.sizeMd;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        fullWidth && styles.fullWidth,
        showShadow && styles.shadow,
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sizeSm: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sizeMd: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sizeLg: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  fullWidth: {
    alignSelf: 'stretch',
  },

  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  text: {
    fontSize: 13,
    fontWeight: '700',
  },
});
