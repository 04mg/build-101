export type ThemePalette = 'zinc' | 'violet' | 'blue' | 'emerald' | 'rose' | 'amber'

export type RadiusValue = 0 | 0.3 | 0.5 | 0.75 | 1.0

export interface ThemeConfig {
  palette: ThemePalette
  radius: RadiusValue
  isDark: boolean
}
