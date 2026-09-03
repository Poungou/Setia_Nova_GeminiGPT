// src/lib/image.js
//
// Une valeur d'image peut etre :
//   - une simple chaine  "/media/xxx.webp"
//   - un objet cadre      { src: "/media/xxx.webp", focus: "50% 20%" }

export const DEFAULT_FOCUS = '50% 50%'

export function imgSrc(value) {
  if (!value) return ''
  return typeof value === 'string' ? value : value.src || ''
}

export function imgFocus(value) {
  if (value && typeof value === 'object' && value.focus) return value.focus
  return DEFAULT_FOCUS
}

export function imgCredit(value, fallback = '') {
  const credit =
    value && typeof value === 'object'
      ? value.source || value.credit || value.image_source || fallback
      : fallback
  return String(credit || '').trim()
}

// Reconstruit une valeur compacte : chaine si cadrage par defaut, objet sinon.
export function makeImageValue(src, focus) {
  if (!src) return ''
  return !focus || focus === DEFAULT_FOCUS ? src : { src, focus }
}
