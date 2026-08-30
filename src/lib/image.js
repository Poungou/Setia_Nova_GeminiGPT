// src/lib/image.js
//
// Une valeur d'image peut être :
//   - une simple chaîne  "/media/xxx.webp"
//   - un objet cadré      { src: "/media/xxx.webp", focus: "50% 20%" }
//
// `focus` est un `object-position` CSS : il décide quelle partie de l'image
// reste visible quand on la recadre en vignette (comme le repositionnement
// d'une photo de profil).

export const DEFAULT_FOCUS = '50% 50%'

export function imgSrc(value) {
  if (!value) return ''
  return typeof value === 'string' ? value : value.src || ''
}

export function imgFocus(value) {
  if (value && typeof value === 'object' && value.focus) return value.focus
  return DEFAULT_FOCUS
}

// Reconstruit une valeur compacte : chaîne si cadrage par défaut, objet sinon.
export function makeImageValue(src, focus) {
  if (!src) return ''
  return !focus || focus === DEFAULT_FOCUS ? src : { src, focus }
}
