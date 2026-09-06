// worker/lib/siteSettings.js
//
// Stockage clé/valeur générique dans la table D1 `site_settings` (créée par
// migrations/0003_creator_profile_and_character_image_meta.sql, jusqu'ici
// sans lecteur/écrivain actif — voir docs/COMMUNAUTE_VERS_JOUEURS.md). Sert
// pour l'instant uniquement aux réglages de musique de fond globale
// (clé "music"), sans nouvelle table ni migration.

export async function getSiteSetting(env, key) {
  const row = await env.WOLTAR_DB.prepare('SELECT data FROM site_settings WHERE key = ?').bind(key).first()
  if (!row) return null
  try {
    return JSON.parse(row.data)
  } catch {
    return null
  }
}

// Ne doit jamais faire échouer une page publique : si la table est absente
// ou la lecture échoue, on retombe sur `null` (réglages par défaut côté
// appelant) plutôt que de casser la navigation.
export async function safeGetSiteSetting(env, key) {
  try {
    return await getSiteSetting(env, key)
  } catch (err) {
    console.error('[siteSettings] lecture impossible', err)
    return null
  }
}

export async function setSiteSetting(env, key, data) {
  const now = new Date().toISOString()
  const payload = JSON.stringify(data)
  const existing = await env.WOLTAR_DB.prepare('SELECT key FROM site_settings WHERE key = ?').bind(key).first()

  if (existing) {
    await env.WOLTAR_DB.prepare('UPDATE site_settings SET data = ?, updated_at = ? WHERE key = ?').bind(payload, now, key).run()
  } else {
    await env.WOLTAR_DB.prepare(
      'INSERT INTO site_settings (key, data, created_at, updated_at) VALUES (?, ?, ?, ?)',
    )
      .bind(key, payload, now, now)
      .run()
  }

  return data
}
