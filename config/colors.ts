// config/colors.ts
import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  common: {
    // Gray
    gray100: '#f1f5f9',
    gray200: '#e2e8f0',
    gray300: '#cbd5e1',
    gray400: '#94a3b8',
    gray500: '#64748b',
    gray600: '#475569',
    gray700: '#334155',
    gray800: '#1e293b',
    gray900: '#0f172a',
  },
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

    dangerBackground: '#fee2e2',
    dangerText: '#b91c1c',

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

    dangerBackground: '#fee2e2',
    dangerText: '#b91c1c',

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
