import { tint } from '@/utils/color.utils'

export type AppTheme = {
  background: string
  screenBackgroundAccent: string
  surface: string
  surfaceMuted: string
  text: string
  textMuted: string
  hint: string
  border: string
  borderLight: string
  overlay: string
  shadow: string
  white: string
  black: string
  primaryBackground: string
  primaryText: string
  primarySoft: string
  primaryBorder: string
  secondaryBackground: string
  secondaryText: string
  ghostText: string
  linkText: string
  outlineBorder: string
  outlineText: string
  dangerBackground: string
  dangerText: string
  success: string
  info: string
  memberAccent: string
  focusRing: string
}

const DEFAULT_MEMBER_ACCENT = '#3b5bdb'

type BaseThemeTokens = {
  background: string
  surface: string
  surfaceMuted: string
  text: string
  textMuted: string
  hint: string
  border: string
  borderLight: string
  overlay: string
  shadow: string
  white: string
  black: string
  dangerBackground: string
  dangerText: string
  info: string
}

const BASE_THEME: BaseThemeTokens = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceMuted: '#f8fafc',
  text: '#0f172a',
  textMuted: '#475569',
  hint: '#94a3b8',
  border: '#cbd5e1',
  borderLight: '#e2e8f0',
  overlay: 'rgba(15, 23, 42, 0.35)',
  shadow: '#000000',
  white: '#ffffff',
  black: '#000000',
  dangerBackground: '#fee2e2',
  dangerText: '#b91c1c',
  info: '#2563eb',
}

function getReadableTextColor(hex: string) {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  const expanded =
    normalized.length === 3
      ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
      : normalized

  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)
  const luminance = (r * 299 + g * 587 + b * 114) / 1000

  return luminance > 160 ? '#0f172a' : '#ffffff'
}

export function getTheme(memberAccentHex?: string | null): AppTheme {
  const accent = memberAccentHex ?? DEFAULT_MEMBER_ACCENT
  const accentText = getReadableTextColor(accent)

  return {
    ...BASE_THEME,
    screenBackgroundAccent: tint(accent, 0.06),
    primaryBackground: accent,
    primaryText: accentText,
    primarySoft: tint(accent, 0.12),
    primaryBorder: accent,
    secondaryBackground: tint(accent, 0.12),
    secondaryText: accent,
    ghostText: accent,
    linkText: accent,
    outlineBorder: accent,
    outlineText: accent,
    success: accent,
    memberAccent: accent,
    focusRing: tint(accent, 0.28),
  }
}
