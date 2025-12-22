// components/ui/button.tsx
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useColorScheme,
} from 'react-native';

import { Colors } from '@/config/colors';

export type ButtonType =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

type ButtonProps = {
  title: string;
  type?: ButtonType;
  size?: ButtonSize;
  onPress?: () => void;
  bold?: boolean;
  uppercase?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  showShadow?: boolean;
  style?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactElement;
  leftIconColor?: string;
  rightIcon?: React.ReactElement;
  rightIconColor?: string;
};

export function Button({
  title,
  type = 'primary',
  size = 'md',
  onPress,
  bold = false,
  uppercase = false,
  disabled = false,
  fullWidth = false,
  showShadow = false,
  style,
  leftIcon,
  leftIconColor,
  rightIcon,
  rightIconColor,
}: ButtonProps) {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? Colors.dark : Colors.light;

  const typeStyles = getTypeStyles(type, theme);

  const sizeButtonStyle =
    size === 'sm'
      ? styles.sizeSm
      : size === 'lg'
        ? styles.sizeLg
        : size === 'xl'
          ? styles.sizeXl
          : styles.sizeMd;

  const sizeTextStyle =
    size === 'sm'
      ? styles.textSm
      : size === 'lg'
        ? styles.textLg
        : size === 'xl'
          ? styles.textXl
          : styles.textMd;

  const textColor = (typeStyles.text && typeStyles.text.color) || '#000';
  const resolvedLeftIconColor = leftIconColor ?? textColor;
  const resolvedRightIconColor = rightIconColor ?? textColor;

  const renderLeftIcon = () => {
    if (!leftIcon) return null;
    return React.cloneElement(leftIcon as any, {
      color: resolvedLeftIconColor,
      style: [
        (leftIcon as any).props?.style,
        { color: resolvedLeftIconColor },
      ],
    });
  };

  const renderRightIcon = () => {
    if (!rightIcon) return null;
    return React.cloneElement(rightIcon as any, {
      color: resolvedRightIconColor,
      style: [
        (rightIcon as any).props?.style,
        { color: resolvedRightIconColor },
      ],
    });
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        sizeButtonStyle,
        typeStyles.button,
        fullWidth && styles.fullWidth,
        showShadow && styles.shadow,
        {
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {leftIcon && renderLeftIcon()}

        <Text
          style={[
            styles.text,
            sizeTextStyle,
            typeStyles.text,
            bold && styles.textBold,
            uppercase && styles.uppercase,
          ]}
        >
          {title}
        </Text>

        {rightIcon && renderRightIcon()}
      </View>
    </Pressable>
  );
}

function getTypeStyles(type: ButtonType, theme: any) {
  switch (type) {
    case 'primary':
      return {
        button: { backgroundColor: theme.primaryBackground },
        text: { color: theme.primaryText },
      };

    case 'secondary':
      return {
        button: { backgroundColor: theme.secondaryBackground },
        text: { color: theme.secondaryText },
      };

    case 'ghost':
      return {
        button: { backgroundColor: 'transparent' },
        text: { color: theme.ghostText },
      };

    case 'outline':
      return {
        button: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.outlineBorder,
        },
        text: { color: theme.outlineText },
      };

    case 'danger':
      return {
        button: { backgroundColor: theme.dangerBackground },
        text: { color: theme.dangerText },
      };

    default:
      return {
        button: { backgroundColor: theme.primaryBackground },
        text: { color: theme.primaryText },
      };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  sizeSm: { paddingHorizontal: 10, paddingVertical: 6 },
  sizeMd: { paddingHorizontal: 14, paddingVertical: 8 },
  sizeLg: { paddingHorizontal: 18, paddingVertical: 10 },
  sizeXl: { paddingHorizontal: 22, paddingVertical: 12 },

  fullWidth: { alignSelf: 'stretch' },

  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  text: { fontWeight: '500' },
  textBold: { fontWeight: '700' },
  textSm: { fontSize: 12 },
  textMd: { fontSize: 13 },
  textLg: { fontSize: 16 },
  textXl: { fontSize: 20 },

  uppercase: { textTransform: 'uppercase' },
});
