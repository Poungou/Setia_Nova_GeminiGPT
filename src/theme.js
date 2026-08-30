// src/theme.js
// Le thème initial est posé par le script inline de index.html.
// Ce module ne gère que le changement manuel + la persistance.

export const THEME_KEY = 'woltar-theme'

export function getTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {
    /* stockage indisponible : le thème reste appliqué pour la session */
  }
  return t
}

export function toggleTheme() {
  return setTheme(getTheme() === 'light' ? 'dark' : 'light')
}
