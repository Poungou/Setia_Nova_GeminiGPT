// src/lib/moderationApi.js
//
// Dialogue avec les routes de modération du Worker (/__admin/api/moderation,
// réservées au rôle admin ET revérifiées côté serveur) et avec les routes de
// signalement / d'envoi pour validation. Aucun droit n'est décidé ici : une
// réponse 401/403 du serveur est la seule vérité.

const ADMIN = '/__admin/api/moderation'

async function json(res) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body.error || `Erreur ${res.status}`), { status: res.status })
  return body
}

const get = (path) => fetch(`${ADMIN}/${path}`, { credentials: 'same-origin' }).then(json)
const post = (url, payload = {}) => fetch(url, {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
}).then(json)

export const moderationApi = {
  counts: async () => (await get('counts')).data,
  pending: async () => (await get('pending')).data,
  reports: async () => (await get('reports')).data,
  history: async () => (await get('history')).data,
  // action : approve | request-changes | reject
  decide: (collection, id, action, note = '') =>
    post(`${ADMIN}/content/${collection}/${encodeURIComponent(id)}/${action}`, { note }),
  // action : keep | hide
  handleReport: (reportId, action, note = '') =>
    post(`${ADMIN}/reports/${encodeURIComponent(reportId)}/${action}`, { note }),
}

// Signalement public (aucune connexion requise).
export function sendReport({ contentType, contentId, reason, details = '' }) {
  return post('/__public/api/reports', { contentType, contentId, reason, details })
}

// Envoi d'une fiche de compte pour validation.
export function submitForReview(collection, id) {
  return post(`/__account/api/collections/${collection}/${encodeURIComponent(id)}/submit`)
}

// Le menu et la Vue d'ensemble se rafraîchissent quand la file change.
export const MODERATION_CHANGED = 'woltar:moderation-changed'
export const notifyModerationChanged = () => window.dispatchEvent(new window.Event(MODERATION_CHANGED))
