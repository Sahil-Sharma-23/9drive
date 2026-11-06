import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'

const themeStorageKey = '9drive:theme'
const themeColors: Record<Theme, string> = { light: '#fafcfd', dark: '#090d16' }

export function getStoredTheme(): Theme {
  const saved = localStorage.getItem(themeStorageKey)
  return saved === 'light' || saved === 'dark' ? saved : 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme])
  localStorage.setItem(themeStorageKey, theme)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    const commit = () => {
      flushSync(() => setTheme(next))
      applyTheme(next)
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if ('startViewTransition' in document && !reduceMotion) document.startViewTransition(commit)
    else commit()
  }, [theme])

  return { theme, toggleTheme }
}
