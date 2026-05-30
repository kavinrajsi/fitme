'use client'

/**
 * Custom theme provider — replaces next-themes to avoid the React 19 warning
 * caused by next-themes injecting an inline <script> inside a component tree.
 *
 * The blocking theme-detection script lives in layout.js <head> as a plain
 * dangerouslySetInnerHTML script (server-rendered, not a React component).
 * This context layer handles runtime switching and persistence to localStorage.
 *
 * On mount, reads the stored preference from localStorage and listens for
 * system colour scheme changes — if theme is 'system', the .dark class on <html>
 * is updated live when the OS switches between light and dark mode.
 *
 * useTheme() — consume the current theme value and setTheme() setter.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ThemeCtx = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system')

  useEffect(() => {
    setThemeState(localStorage.getItem('fitme-theme') || 'system')

    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      if ((localStorage.getItem('fitme-theme') || 'system') === 'system') {
        document.documentElement.classList.toggle('dark', mq.matches)
      }
    }
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    localStorage.setItem('fitme-theme', next)
    const isDark =
      next === 'dark' ||
      (next === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  return useContext(ThemeCtx)
}
