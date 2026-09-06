// src/lib/mediaTypes.js
//
// Constantes et validations partagées pour l'upload de médias (images +
// audio), utilisées par les TROIS implémentations du même mécanisme :
//   - worker/lib/mediaStore.js   (production, Cloudflare Worker + R2)
//   - plugins/lib/mediaStore.js  (dev, écrit dans public/media/)
//   - src/lib/mediaUpload.js     (client — prépare le fichier avant l'envoi)
//
// Un seul endroit pour les types acceptés et les limites de taille, comme
// src/lib/musicSettings.js pour les réglages de musique. Fichier isomorphe
// (pas d'API Node ni navigateur ici) : importable tel quel depuis le
// navigateur, un Worker ou un script Node.

export const IMAGE_MIME_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
}

export const AUDIO_MIME_EXT = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/vnd.wave': '.wav',
}

export const MEDIA_KINDS = ['image', 'audio']

// Nom de dossier/préfixe de clé par type — évite un "audios" bancal en
// pluralisant bêtement le kind (voir worker/lib/mediaStore.js).
export const MEDIA_KIND_FOLDER = { image: 'images', audio: 'audio' }

export function extMapFor(kind) {
  return kind === 'audio' ? AUDIO_MIME_EXT : IMAGE_MIME_EXT
}

// Limites appliquées à la fois côté client (retour immédiat) et côté
// serveur (source de vérité — jamais fait confiance au client seul).
export const MAX_BYTES = {
  image: 8 * 1024 * 1024, // 8 Mo
  audio: 20 * 1024 * 1024, // 20 Mo
}

export function describeAccepted(kind) {
  return Object.values(extMapFor(kind))
    .filter((ext, i, arr) => arr.indexOf(ext) === i)
    .join(', ')
}

export function formatMB(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} Mo`
}

export function slugifyMediaName(name) {
  return (
    String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'fichier'
  )
}

// Découpe une data URL "data:<mime>;base64,<...>" -> { mime, base64 }.
// Retourne null si le format ne correspond pas.
export function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '')
  if (!m) return null
  return { mime: m[1].trim().toLowerCase(), base64: m[2] }
}

// Taille décodée approximative d'une chaîne base64 (suffisant pour valider
// une limite avant décodage complet).
export function approxBase64Bytes(base64) {
  const clean = String(base64 || '')
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding)
}

// Valide { kind, mime, byteLength } et renvoie soit { ok: true, ext } soit
// { ok: false, status, message } — utilisé par les deux implémentations
// serveur (Worker/R2 et plugin Vite/disque) pour un message d'erreur
// identique des deux côtés.
export function validateMedia({ kind, mime, byteLength }) {
  const safeKind = MEDIA_KINDS.includes(kind) ? kind : 'image'
  const map = extMapFor(safeKind)
  const ext = map[mime]
  if (!ext) {
    return {
      ok: false,
      status: 415,
      message: `Type de fichier non supporté (${mime || 'inconnu'}). Formats acceptés : ${describeAccepted(safeKind)}.`,
    }
  }
  const max = MAX_BYTES[safeKind]
  if (byteLength > max) {
    return {
      ok: false,
      status: 413,
      message: `Fichier trop volumineux (${formatMB(byteLength)}, maximum ${formatMB(max)}).`,
    }
  }
  return { ok: true, ext, kind: safeKind }
}
