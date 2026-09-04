// worker/lib/rateLimit.js
//
// Rate limiting / temporisation minimaliste, appuyé sur D1 (aucune autre
// mémoire persistante n'est disponible dans un Worker sans état entre deux
// requêtes). Compte les évènements récents dans un "bucket" (ex.
// "login:email:x@y.tld") sur une fenêtre glissante, purge les entrées hors
// fenêtre au passage — voir migrations/0005_account_security.sql pour la
// table rate_limit_log, et plugins/lib/rateLimit.js pour l'équivalent en
// mémoire côté serveur de dev local.
//
// Volontairement séparé du rate limiting déjà présent dans
// worker/routes/aether.js (propre à l'IA, logique différente) — pas de
// fusion pour ne pas coupler deux usages distincts.

import { httpError } from './authStore.js'

export async function checkRateLimit(env, bucket, { max, windowMs }) {
  const db = env.WOLTAR_DB
  const now = Date.now()
  const windowStart = now - windowMs

  await db.prepare('DELETE FROM rate_limit_log WHERE bucket = ? AND created_at < ?').bind(bucket, windowStart).run()

  const row = await db
    .prepare('SELECT COUNT(*) as count FROM rate_limit_log WHERE bucket = ? AND created_at >= ?')
    .bind(bucket, windowStart)
    .first()

  if ((row?.count || 0) >= max) {
    throw httpError(429, 'Trop de tentatives. Réessaie dans quelques minutes.')
  }

  await db.prepare('INSERT INTO rate_limit_log (bucket, created_at) VALUES (?, ?)').bind(bucket, now).run()
}

// Cloudflare pose toujours CF-Connecting-IP sur les requêtes qui atteignent
// le Worker — x-forwarded-for en secours pour rester robuste en test/preview.
export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown'
}
