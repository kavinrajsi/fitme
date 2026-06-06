'use client'

/** Thin wrapper around next-themes; mounted at the root layout (defaults to dark). */
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
