// worker/lib/mediaStore.js
//
// Stockage média de production — Cloudflare R2 (binding `WOLTAR_MEDIA`, voir
// wrangler.jsonc). Sert d'implémentation UNIQUE réutilisée par toutes les
// routes d'upload (musique du site dans worker/routes/admin.js, avatar
// joueur dans worker/routes/account.js) plutôt que plusieurs mécanismes
// concurrents — voir src/lib/mediaTypes.js pour les types/tailles partagés
// avec le plugin Vite de dev (plugins/lib/mediaStore.js) et le client
// (src/lib/mediaUpload.js).
//
// Les fichiers ne sont JAMAIS stockés dans D1 (BLOB en base) : seule l'URL
// `/uploads/<clé>` renvoyée par saveMedia() est enregistrée dans D1 (colonne
// TEXT), le contenu binaire réel vit uniquement dans R2. Lecture publique
// via worker/routes/media.js (GET /uploads/*).

import { httpError } from './authStore.js'
import { MEDIA_KIND_FOLDER, approxBase64Bytes, parseDataUrl, slugifyMediaName, validateMedia } from '../../src/lib/mediaTypes.js'

function base64ToBytes(base64) {
  // atob() est disponible nativement dans l'environnement Worker.
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// { filename, dataUrl, kind } -> { path }. kind vaut 'image' ou 'audio' ;
// toute autre valeur retombe sur 'image' (voir validateMedia).
export async function saveMedia(env, { filename, dataUrl, kind }) {
  if (!env.WOLTAR_MEDIA) {
    throw httpError(
      501,
      "Stockage média non configuré côté serveur (bucket R2 « WOLTAR_MEDIA » manquant). Utilise une URL en attendant, ou vois wrangler.jsonc.",
    )
  }

  const parsed = parseDataUrl(dataUrl)
  if (!parsed) throw httpError(400, 'Fichier invalide.')

  const approxBytes = approxBase64Bytes(parsed.base64)
  const check = validateMedia({ kind, mime: parsed.mime, byteLength: approxBytes })
  if (!check.ok) throw httpError(check.status, check.message)

  let bytes
  try {
    bytes = base64ToBytes(parsed.base64)
  } catch {
    throw httpError(400, 'Fichier invalide (encodage).')
  }

  // Revalidation sur la taille réellement décodée (approxBase64Bytes n'est
  // qu'une estimation rapide côté client/pré-check).
  const finalCheck = validateMedia({ kind: check.kind, mime: parsed.mime, byteLength: bytes.byteLength })
  if (!finalCheck.ok) throw httpError(finalCheck.status, finalCheck.message)

  const base = slugifyMediaName(String(filename || check.kind).replace(/\.[^.]+$/, ''))
  const key = `${MEDIA_KIND_FOLDER[check.kind]}/${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}${finalCheck.ext}`

  await env.WOLTAR_MEDIA.put(key, bytes, { httpMetadata: { contentType: parsed.mime } })

  return { path: `/uploads/${key}` }
}

// Sert un objet R2 précédemment stocké par saveMedia() — voir
// worker/routes/media.js (GET /uploads/*), route publique (pas d'auth :
// les avatars/musique doivent être visibles par toute visiteuse).
export async function readMedia(env, key) {
  if (!env.WOLTAR_MEDIA) return null
  return env.WOLTAR_MEDIA.get(key)
}
