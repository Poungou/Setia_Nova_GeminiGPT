// src/pages/Chronology/hearts.js
//
// Couleur du petit cœur affiché sur chaque nœud de la frise (/chronologie).
// Utilise EXCLUSIVEMENT les illustrations fournies par l'utilisatrice
// (illustration_site/coeur_grand_[couleur].png → copiées telles quelles
// dans public/hearts/, jamais les .gif, jamais redessinées).
//
// Résolution en deux temps, pensée pour être ajustée facilement PLUS TARD
// sans jamais toucher aux données de la chronologie (src/data/events.json) :
//   1. Une correspondance explicite par identifiant d'événement dans
//      EVENT_HEART_OVERRIDES ci-dessous — à éditer ici pour forcer la
//      couleur d'un événement précis (ex. "blanc" pour un événement futur
//      ou encore incertain).
//   2. À défaut, déduite automatiquement de la teinte du premier
//      personnage lié à l'événement (character.color, même logique de
//      teinte HSL que src/lib/frames.js pour les cadres), mais reportée
//      sur la palette complète des 9 cœurs plutôt que les 4 teintes de
//      cadre.
//   3. Sans personnage ou sans couleur définie : gris — couleur neutre /
//      secondaire, comme demandé.
// Le blanc n'est donc jamais choisi automatiquement : c'est un choix
// éditorial réservé aux overrides manuels ci-dessous.

export const HEART_COLORS = ['cyan', 'gris', 'rouge', 'violet', 'jaune', 'vert', 'bleu', 'rose', 'blanc']

export function getHeartSrc(color) {
  const key = HEART_COLORS.includes(color) ? color : 'gris'
  return `/hearts/coeur_grand_${key}.png`
}

// Overrides manuels par id d'événement (src/data/events.json → champ `id`).
// Vide pour l'instant — ajoute une ligne pour forcer une couleur, ex. :
//   'lecole-de-magie-de-kazuko': 'blanc',
const EVENT_HEART_OVERRIDES = {}

export function getEventHeartColor(event, relatedCharacters) {
  if (!event) return 'gris'
  if (EVENT_HEART_OVERRIDES[event.id]) return EVENT_HEART_OVERRIDES[event.id]
  const withColor = (relatedCharacters || []).find((c) => c?.color)
  return (withColor && hueToHeartColor(withColor.color)) || 'gris'
}

function hueToHeartColor(hex) {
  const hue = hexHue(hex)
  if (hue === null) return null
  if (hue >= 345 || hue < 20) return 'rouge'
  if (hue < 65) return 'jaune'
  if (hue < 165) return 'vert'
  if (hue < 200) return 'cyan'
  if (hue < 255) return 'bleu'
  if (hue < 320) return 'violet'
  return 'rose'
}

function hexHue(hex) {
  if (!hex || typeof hex !== 'string') return null
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const int = parseInt(m[1], 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return null
  const d = max - min
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return h * 60
}
