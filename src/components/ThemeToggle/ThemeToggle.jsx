import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { getTheme, toggleTheme } from '../../theme.js'
import './ThemeToggle.css'

export default function ThemeToggle() {
  const [theme, setThemeState] = useState('dark')

  useEffect(() => {
    setThemeState(getTheme())
  }, [])

  const onClick = () => setThemeState(toggleTheme())

  const next = theme === 'light' ? 'sombre' : 'clair'
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onClick}
      aria-label={`Passer au thème ${next}`}
      title={`Thème ${next}`}
    >
      {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
      <span>{theme === 'light' ? 'Sombre' : 'Clair'}</span>
    </button>
  )
}
