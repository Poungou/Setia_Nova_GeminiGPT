// src/lib/frames.js
//
// Illustrations de cadres fournies par l'utilisatrice (pack validé, voir
// public/frames/ + illustration_site/README.txt) : 4 teintes disponibles,
// une image PNG par teinte, trou transparent pour la photo — PAS un cercle
// parfait : la couronne/gemme en haut de chaque cadre mord dans le trou,
// qui est donc plus étroit en haut qu'en bas. Un premier calage au rayon
// minimum (le plus prudent, pour ne jamais passer sous les décorations)
// laissait un anneau visible du fond de la carte entre la photo et le
// cadre dans la plupart des directions — signalé par l'utilisatrice
// (« le blanc grignote l'image du dessous »).
//
// Recalé (30/08/2026) : centre du disque décalé vers le bas pour se caler
// sur le rétrécissement du haut (couronne) sans être pénalisé ailleurs,
// et rayon augmenté en conséquence — mesuré par ray-casting directionnel
// (haut/bas/gauche/droite/diagonales) sur chaque PNG. Résultat : la photo
// déborde très légèrement SOUS les décorations aux points les plus serrés
// (normal et attendu pour un cadre monté — invisible), au lieu de laisser
// un vide de fond de carte visible tout autour. `inset` ci-dessous donne
// les 4 côtés (haut, droite, bas, gauche) car le trou n'est pas centré
// symétriquement dans l'image.

export const FRAME_COLORS = ['bleu', 'gris', 'rouge', 'violet']

const FRAME_META = {
  bleu: { src: '/frames/cadre_grand_bleu.png', inset: { top: 19.2, right: 16.3, bottom: 12.0, left: 13.4 } },
  gris: { src: '/frames/cadre_grand_gris.png', inset: { top: 19.6, right: 15.9, bottom: 11.5, left: 12.7 } },
  rouge: { src: '/frames/cadre_grand_rouge.png', inset: { top: 19.0, right: 18.7, bottom: 11.2, left: 9.0 } },
  violet: { src: '/frames/cadre_grand_violet.png', inset: { top: 17.7, right: 15.5, bottom: 9.9, left: 11.2 } },
}

export function getFrameMeta(frameColor) {
  return FRAME_META[frameColor] || FRAME_META.gris
}

// Déduit une teinte de cadre (bleu/gris/rouge/violet) à partir du hex de
// couleur du personnage, quand `frameColor` n'est pas renseigné à la main
// dans l'admin. Sans couleur : gris (comme la "version grise" par défaut).
export function deriveFrameColor(hex) {
  const hue = hexHue(hex)
  if (hue === null) return 'gris'
  if (hue >= 150 && hue <= 255) return 'bleu'
  if (hue > 255 && hue <= 330) return 'violet'
  return 'rouge'
}

export function resolveFrameColor(character) {
  if (character?.frameColor && FRAME_COLORS.includes(character.frameColor)) {
    return character.frameColor
  }
  return deriveFrameColor(character?.color)
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
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0))
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return h * 60
}
