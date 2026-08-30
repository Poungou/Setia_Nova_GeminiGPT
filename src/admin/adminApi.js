// src/admin/adminApi.js
//
// Dialogue avec le plugin Vite `woltar-admin` (dev uniquement).
// En build de production, `adminAvailable` est faux et l'admin s'affiche en
// lecture seule avec un message d'explication.

const BASE = '/__admin/api'

export const adminAvailable = import.meta.env.DEV

async function json(res) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return body
}

export async function getCollection(name) {
  const body = await json(await fetch(`${BASE}/collections/${name}`))
  return body.data
}

export async function saveCollection(name, rows) {
  const body = await json(
    await fetch(`${BASE}/collections/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    }),
  )
  return body
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

// Redimensionne et compresse en WebP avant l'envoi (les PNG bruts font
// facilement plusieurs Mo — inutile pour un affichage web, et ça alourdit le
// dépôt). SVG et GIF passent tels quels (pas de rasterisation / on garde l'animation).
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

export async function uploadImage(file) {
  const payload = await prepareImage(file)
  const body = await json(
    await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
  return body.path
}
