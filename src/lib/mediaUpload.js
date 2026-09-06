// src/lib/mediaUpload.js
//
// Prépare un fichier choisi par l'utilisatrice (image ou audio) et l'envoie
// vers un endpoint d'upload (`/__admin/api/upload` ou `/__account/api/upload`
// selon le contexte — voir src/admin/adminApi.js et src/lib/accountApi.js).
// Mécanisme UNIQUE réutilisé par tous les boutons "Choisir un fichier" du
// site (portraits, galerie, emblèmes, couvertures du Journal, musique,
// avatar joueur) plutôt que plusieurs implémentations concurrentes — voir
// src/lib/mediaTypes.js pour les types/tailles partagés avec le serveur.

import { MAX_BYTES, extMapFor, describeAccepted, formatMB } from './mediaTypes.js'

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

// Redimensionne et compresse les images en WebP avant l'envoi (les PNG bruts
// font facilement plusieurs Mo — inutile pour un affichage web, et ça
// alourdit le stockage). SVG et GIF passent tels quels (pas de
// rasterisation / on garde l'animation).
const MAX_EDGE = 1800
const PASSTHROUGH = ['image/svg+xml', 'image/gif']

async function prepareImage(file) {
  if (PASSTHROUGH.includes(file.type)) {
    return { filename: file.name, dataUrl: await fileToDataUrl(file) }
  }
  const srcUrl = await fileToDataUrl(file)
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Image illisible'))
    i.src = srcUrl
  })
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  if (scale === 1 && file.size < 400 * 1024) {
    return { filename: file.name, dataUrl: srcUrl }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/webp', 0.85)
  const base = file.name.replace(/\.[^.]+$/, '')
  return { filename: `${base}.webp`, dataUrl }
}

// L'audio n'est pas retouché (pas de recompression fiable côté navigateur) :
// on l'envoie tel quel, la validation de type/taille se charge du reste.
async function prepareAudio(file) {
  return { filename: file.name, dataUrl: await fileToDataUrl(file) }
}

// Vérification immédiate côté client (retour instantané avant même de lire
// le fichier) — la validation qui compte reste celle du serveur, jamais
// contournable, voir worker/lib/mediaStore.js et plugins/lib/mediaStore.js.
export function validateFileBeforeUpload(file, kind = 'image') {
  if (!file) return 'Aucun fichier sélectionné.'
  const map = extMapFor(kind)
  if (!map[file.type]) {
    return `Type de fichier non supporté (${file.type || 'inconnu'}). Formats acceptés : ${describeAccepted(kind)}.`
  }
  const max = MAX_BYTES[kind]
  if (file.size > max) {
    return `Fichier trop volumineux (${formatMB(file.size)}, maximum ${formatMB(max)}).`
  }
  return null
}

async function toJson(res) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return body
}

// endpoint : URL complète de la route d'upload (`/__admin/api/upload` ou
// `/__account/api/upload`). kind : 'image' | 'audio'.
export async function uploadMedia(file, { kind = 'image', endpoint }) {
  const clientError = validateFileBeforeUpload(file, kind)
  if (clientError) throw new Error(clientError)

  const payload = kind === 'audio' ? await prepareAudio(file) : await prepareImage(file)
  const body = await toJson(
    await fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, kind }),
    }),
  )
  return body.path
}
