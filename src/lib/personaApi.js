// src/lib/personaApi.js
//
// Dialogue avec le backend de chat IA : /__ai/api/chat, servi en dev par le
// plugin Vite `woltar-ai` et en production par le Worker Cloudflare
// (worker/routes/ai.js) — les deux existent désormais, donc le chat est
// disponible aussi bien en dev qu'en build de production.

const BASE = '/__ai/api'

export const personaChatAvailable = true

export async function sendPersonaMessage(personaId, messages, { testMode = false } = {}) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personaId,
      testMode,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return body.reply
}
