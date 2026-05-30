'use client'

/**
 * Theme switcher — three-button toggle (System / Light / Dark) shown on the profile page.
 * The `mounted` guard delays rendering until after hydration to prevent a mismatch
 * between the server-rendered state (always 'system') and the client-read localStorage value.
 * Without it, the active button would flash to the wrong selection on first paint.
 */
import { useEffect, useState } from 'react'
import { useTheme } from '@/components/theme-provider'
import { Icon } from '@/components/icon'

const options = [
  { value: 'system', label: 'System', icon: 'computer' },
  { value: 'light',  label: 'Light',  icon: 'light_mode' },
  { value: 'dark',   label: 'Dark',   icon: 'dark_mode' },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="h-10" />

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
            ${theme === opt.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted'
            }`}
        >
          <Icon name={opt.icon} size={18} />
          {opt.label}
        </button>
      ))}
    </div>
  )
}
