// plugins/lib/rateLimit.js
//
// Équivalent dev de worker/lib/rateLimit.js : pas de D1 en local, donc un
// compteur en mémoire (le process du serveur Vite tourne en continu pendant
// toute la session de dev — largement suffisant pour tester le
// comportement ; la fenêtre se réinitialise juste au redémarrage du
// serveur, ce qui est acceptable ici).

import { httpError } from './authStore.js'

const hits = new Map() // bucket -> timestamps[]

export function checkRateLimit(bucket, { max, windowMs }) {
  const now = Date.now()
  const windowStart = now - windowMs
  const list = (hits.get(bucket) || []).filter((ts) => ts >= windowStart)

  if (list.length >= max) {
    hits.set(bucket, list)
    throw httpError(429, 'Trop de tentatives. Réessaie dans quelques minutes.')
  }

  list.push(now)
  hits.set(bucket, list)
}

export function clientIp(req) {
  return req.socket?.remoteAddress || 'unknown'
}
