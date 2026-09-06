import { useEffect, useState } from 'react'
import { Moon, Sun, Flame } from 'lucide-react'
import { getTheme, setTheme, toggleTheme, THEMES } from '../../theme.js'
import './ThemeToggle.css'

const THEME_META = {
  dark: { label: 'Sombre', Icon: Moon },
  light: { label: 'Clair', Icon: Sun },
  woltar: { label: 'Woltar', Icon: Flame },
}

export default function ThemeToggle({ compact = false }) {
  const [theme, setThemeState] = useState('dark')

  useEffect(() => {
    setThemeState(getTheme())
  }, [])

  const onClick = () => setThemeState(toggleTheme())

  // Le bouton annonce et illustre le thème vers lequel il bascule (pas le
  // thème actuel), pour rester cohérent avec le comportement d'origine.
  const nextTheme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
  const { label, Icon } = THEME_META[nextTheme]

  if (compact) return (
    <label className="theme-select" title={`Thème actuel : ${THEME_META[theme].label}`}>
      <span aria-hidden="true">Thème ▾</span>
      <select aria-label="Thème" value={theme} onChange={(event) => setThemeState(setTheme(event.target.value))}>
        {THEMES.map((value) => <option key={value} value={value}>{THEME_META[value].label}</option>)}
      </select>
    </label>
  )

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onClick}
      aria-label={`Passer au thème ${label.toLowerCase()}`}
      title={`Thème ${label.toLowerCase()}`}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  )
}
