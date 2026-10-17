import { useState, useEffect } from 'react'
import type { ThemePalette, RadiusValue, ThemeConfig } from '../types'

const STORAGE_KEY = 'trailbase_starter_theme'

export function useThemeCustomizer() {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      palette: 'violet',
      radius: 0.5,
      isDark: true,
    }
  })

  useEffect(() => {
    const root = document.documentElement

    // 1. Set palette data-theme attribute
    if (config.palette === 'zinc') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', config.palette)
    }

    // 2. Set radius CSS variable
    root.style.setProperty('--radius', `${config.radius}rem`)

    // 3. Set dark mode class
    if (config.isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // 4. Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // ignore
    }
  }, [config])

  const setPalette = (palette: ThemePalette) => setConfig(prev => ({ ...prev, palette }))
  const setRadius = (radius: RadiusValue) => setConfig(prev => ({ ...prev, radius }))
  const toggleDark = () => setConfig(prev => ({ ...prev, isDark: !prev.isDark }))

  return {
    config,
    setPalette,
    setRadius,
    toggleDark,
  }
}
