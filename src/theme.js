// src/theme.js
// Le thème initial est posé par le script inline de index.html.
// Ce module ne gère que le changement manuel + la persistance.

export const THEME_KEY = 'woltar-theme'

// Ordre de cycle du sélecteur. 'woltar' n'est jamais choisi automatiquement
// (pas de prefers-color-scheme correspondant) : uniquement via ce toggle,
// puis mémorisé.
export const THEMES = ['dark', 'light', 'woltar']

export function getTheme() {
  const t = document.documentElement.dataset.theme
  return THEMES.includes(t) ? t : 'dark'
}

export function setTheme(theme) {
  const t = THEMES.includes(theme) ? theme : 'dark'
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {
    /* stockage indisponible : le thème reste appliqué pour la session */
  }
  return t
}

export function toggleTheme() {
  const current = getTheme()
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]
  return setTheme(next)
}
