// src/lib/aetherApi.js
//
// Dialogue avec le backend de chat d'AETHER : /__aether/api/chat, servi en
// dev par le plugin Vite `woltar-aether` et en production par le Worker
// Cloudflare (worker/routes/aether.js). Remplace l'ancien src/lib/personaApi.js :
// il n'y a plus qu'un seul assistant IA sur le site.
//
// `context` (optionnel) prépare la capacité technique demandée par le
// cahier des charges (§6) : transmettre à Aether la page actuellement
// consultée, ex. { characterId: 'kazuko-nakamura' } depuis
// /personnages/kazuko-nakamura, pour qu'il comprenne le contexte sans que
// la joueuse ait à le répéter. Aucune UI n'envoie ce contexte pour
// l'instant (pas demandé immédiatement) — la capacité est prête pour un
// futur bouton « Demander à Aether » sur une page précise.

const BASE = '/__aether/api'

export const aetherChatAvailable = true

export async function sendAetherMessage(messages, { context, testMode = false } = {}) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testMode,
      context: context || undefined,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return body.reply
}
