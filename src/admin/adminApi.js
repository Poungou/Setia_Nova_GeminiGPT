// src/admin/adminApi.js
//
// Dialogue avec /__admin/api. En dev, ce endpoint est fourni par le plugin
// Vite `woltar-admin`; en production, il est fourni par le Worker Cloudflare.
//
// Les personnages canon suivent exactement les 6 autres collections
// (lieux, clans, événements, archives, journal, Personas) : l'admin reste
// un outil localhost, jamais un CMS de production — voir Phase 18
// (« Séparer canon local et personnages utilisateurs D1 ») dans
// claude/architecture-decisions.md. Les personnages créés en production
// passent par /compte (D1), pas par /admin — voir src/lib/accountApi.js.

import { uploadMedia } from '../lib/mediaUpload.js'

const BASE = '/__admin/api'

export const adminAvailable = import.meta.env.VITE_WOLTAR_ADMIN_BACKEND !== 'disabled'
// L'upload de fichiers locaux (portraits, galerie...) passe par
// /__admin/api/upload, qui fonctionne aussi bien en dev (plugin Vite) qu'en
// production (Worker Cloudflare + R2 — voir worker/lib/mediaStore.js).
// Auparavant restreint à `import.meta.env.DEV`, ce qui désactivait
// silencieusement le bouton « Choisir un fichier » en production alors que
// l'API le supporte réellement : on s'aligne simplement sur la disponibilité
// du backend admin.
export const localFileUploadsAvailable = adminAvailable
export const adminStorageLabel = import.meta.env.DEV ? 'src/data/*.json' : 'Cloudflare D1'

async function json(res) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return body
}

export async function getCollection(name) {
  const body = await json(await fetch(`${BASE}/collections/${name}`, { credentials: 'same-origin' }))
  return body.data
}

export async function saveCollection(name, rows) {
  const body = await json(
    await fetch(`${BASE}/collections/${name}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    }),
  )
  return body.data || rows
}

// Réglages globaux clé/valeur (table D1 `site_settings` en prod, fichier
// local en dev — voir worker/lib/siteSettings.js / plugins/lib/siteSettings.js).
// Pour l'instant, uniquement la musique de fond globale (clé "music").
export async function getSiteSetting(key) {
  const body = await json(await fetch(`${BASE}/settings/${key}`, { credentials: 'same-origin' }))
  return body.data
}

export async function saveSiteSetting(key, data) {
  const body = await json(
    await fetch(`${BASE}/settings/${key}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  )
  return body.data
}

// Ré-exporté pour compatibilité ascendante — l'implémentation vit
// maintenant dans le module partagé src/lib/mediaUpload.js.
export { fileToDataUrl } from '../lib/mediaUpload.js'

// Upload d'image — portraits, galerie, emblèmes de clan, couvertures du
// Journal, images de lieux... tous les champs "image"/"gallery" de
// src/admin/Fields.jsx passent par ici par défaut. Compression WebP côté
// client avant l'envoi (voir src/lib/mediaUpload.js).
export async function uploadImage(file) {
  return uploadMedia(file, { kind: 'image', endpoint: `${BASE}/upload` })
}

// Upload audio — pistes de la musique de fond du site (voir
// src/admin/AdminMusicPage.jsx). Même mécanisme de stockage que les images
// (worker/lib/mediaStore.js / plugins/lib/mediaStore.js), pas de
// compression côté client.
export async function uploadAudio(file) {
  return uploadMedia(file, { kind: 'audio', endpoint: `${BASE}/upload` })
}
