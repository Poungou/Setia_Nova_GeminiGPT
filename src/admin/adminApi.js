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

export async function uploadImage(file) {
  const dataUrl = await fileToDataUrl(file)
  const body = await json(
    await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, dataUrl }),
    }),
  )
  return body.path
}
