export function tint(hex: string, opacity: number) {
  const expanded = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex
  const r = parseInt(expanded.slice(1, 3), 16)
  const g = parseInt(expanded.slice(3, 5), 16)
  const b = parseInt(expanded.slice(5, 7), 16)
  const amount = Math.max(0, Math.min(1, opacity))
  const mix = (channel: number) => Math.round(255 + (channel - 255) * amount)
  const toHex = (channel: number) => mix(channel).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function formatColorName(name: string) {
  return name.charAt(0) + name.slice(1).toLowerCase()
}
