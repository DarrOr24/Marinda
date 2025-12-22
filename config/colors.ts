// config/colors.ts
import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',

    // Buttons
    primaryBackground: '#3b5bdb',
    primaryText: '#fff',

    secondaryBackground: '#eef2ff',
    secondaryText: '#11181C',

    ghostBackground: 'transparent',
    ghostText: '#3b5bdb',

    outlineBorder: '#3b5bdb',
    outlineText: '#3b5bdb',

    dangerBackground: '#dc2626',
    dangerText: '#fff',

    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',

    // Buttons
    primaryBackground: '#dbe4ff',
    primaryText: '#000',

    secondaryBackground: '#0a7ea4',
    secondaryText: '#fff',

    ghostBackground: 'transparent',
    ghostText: tintColorDark,

    outlineBorder: '#3b5bdb',
    outlineText: '#3b5bdb',

    dangerBackground: '#dc2626',
    dangerText: '#fff',

    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
