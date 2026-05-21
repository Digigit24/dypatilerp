const STORAGE_KEY = 'dyp_theme_config'

export const DEFAULT_THEME_CONFIG = {
  primaryColor: '#4F46E5',
}

const clamp = (value) => Math.max(0, Math.min(255, value))

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const parsed = Number.parseInt(full, 16)
  if (Number.isNaN(parsed)) return { r: 229, g: 72, b: 115 }
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  }
}

const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`

const mix = (hex, target, weight) => {
  const source = hexToRgb(hex)
  const dest = hexToRgb(target)
  return rgbToHex({
    r: Math.round(source.r * (1 - weight) + dest.r * weight),
    g: Math.round(source.g * (1 - weight) + dest.g * weight),
    b: Math.round(source.b * (1 - weight) + dest.b * weight),
  })
}

export const deriveThemeTokens = (primaryColor) => {
  const rgb = hexToRgb(primaryColor)
  return {
    accent: primaryColor,
    accentHover: mix(primaryColor, '#000000', 0.12),
    accentTint: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
    accentSoft: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`,
    scrollbarThumb: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`,
  }
}

export const getThemeConfig = () => {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_THEME_CONFIG
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_THEME_CONFIG
    const parsed = JSON.parse(stored)
    const normalized = parsed.primaryColor?.toLowerCase() === '#e54873'
      ? { ...parsed, primaryColor: DEFAULT_THEME_CONFIG.primaryColor }
      : parsed
    return { ...DEFAULT_THEME_CONFIG, ...normalized }
  } catch {
    return DEFAULT_THEME_CONFIG
  }
}

export const saveThemeConfig = (config) => {
  const next = { ...DEFAULT_THEME_CONFIG, ...config }
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  applyThemeConfig(next)
  return next
}

export const applyThemeConfig = (config = getThemeConfig()) => {
  if (typeof document === 'undefined') return deriveThemeTokens(config.primaryColor)
  const tokens = deriveThemeTokens(config.primaryColor)
  const root = document.documentElement
  root.style.setProperty('--accent', tokens.accent)
  root.style.setProperty('--accent-hover', tokens.accentHover)
  root.style.setProperty('--accent-tint', tokens.accentTint)
  root.style.setProperty('--accent-soft', tokens.accentSoft)
  root.style.setProperty('--scrollbar-thumb', tokens.scrollbarThumb)
  return tokens
}
