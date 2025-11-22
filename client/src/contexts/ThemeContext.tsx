import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const setRootTheme = (theme: string) => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
  }

  const [theme, setTheme] = useState<Theme>(() => {
    const theme = (() => {
      const stored = localStorage.getItem('theme') as Theme | null
      if (stored === 'light' || stored === 'dark') {
        return stored
      }

      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
      return 'light'
    })()

    setRootTheme(theme)
    return theme
  })

  useEffect(() => {
    setRootTheme(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

