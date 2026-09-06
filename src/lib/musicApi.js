// src/lib/musicApi.js
//
// Lecture publique des réglages de musique de fond globale — voir
// worker/routes/public.js (/__public/api/music-settings) et son équivalent
// dev plugins/woltar-public.js. Utilisé par MusicPlayerProvider.

const BASE = '/__public/api'

export async function getMusicSettings() {
  const res = await fetch(`${BASE}/music-settings`, { credentials: 'same-origin' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return body.data
}
