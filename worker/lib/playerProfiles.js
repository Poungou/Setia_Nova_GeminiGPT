const PROFILE_FIELDS = ['avatar', 'image_source', 'player_intro', 'writing_style', 'univers', 'tw', 'rhythm', 'ig_username']

function parseIds(value) {
  try {
    const ids = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === 'string' && id.trim()))] : []
  } catch {
    return []
  }
}

function cleanText(value, max = 12000) {
  return String(value || '').trim().slice(0, max)
}

export function normalizePlayerProfile(payload = {}) {
  return {
    avatar: cleanText(payload.avatar, 100000),
    image_source: cleanText(payload.image_source, 500),
    player_intro: cleanText(payload.player_intro),
    writing_style: cleanText(payload.writing_style),
    univers: cleanText(payload.univers),
    tw: cleanText(payload.tw),
    rhythm: cleanText(payload.rhythm),
    ig_username: cleanText(payload.ig_username, 160),
    profile_public: payload.profile_public === true || payload.profile_public === 1 || payload.profile_public === '1',
  }
}

function rowToProfile(row) {
  if (!row) return null
  return {
    userId: row.user_id,
    exists: true,
    ...Object.fromEntries(PROFILE_FIELDS.map((field) => [field, row[field] || ''])),
    profile_public: Boolean(row.profile_public),
    linked_character_ids: parseIds(row.linked_character_ids),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getPlayerProfile(env, userId) {
  const row = await env.WOLTAR_DB.prepare('SELECT * FROM user_profiles WHERE user_id = ?').bind(userId).first()
  return rowToProfile(row) || { userId, exists: false, ...normalizePlayerProfile(), linked_character_ids: [] }
}

export async function createPlayerProfile(env, userId, payload) {
  // Un profil joueur doit toujours être rattaché à un compte existant —
  // jamais de fiche orpheline, même via un appel direct à l'API (l'admin ne
  // propose que des comptes existants dans son sélecteur, mais ça ne protège
  // pas l'API elle-même).
  const user = await env.WOLTAR_DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
  if (!user) {
    const error = new Error('Ce compte est introuvable.')
    error.status = 404
    throw error
  }
  const existing = await env.WOLTAR_DB.prepare('SELECT user_id FROM user_profiles WHERE user_id = ?').bind(userId).first()
  if (existing) {
    const error = new Error('Ce compte possède déjà un profil joueur.')
    error.status = 409
    throw error
  }
  return savePlayerProfile(env, userId, payload)
}

export async function savePlayerProfile(env, userId, payload) {
  const profile = normalizePlayerProfile(payload)
  const requestedIds = parseIds(payload.linked_character_ids)
  const { results: ownedCharacters } = await env.WOLTAR_DB.prepare('SELECT id FROM characters WHERE owner_user_id = ?').bind(userId).all()
  const ownedIds = new Set((ownedCharacters || []).map((row) => row.id))
  const linkedCharacterIds = requestedIds.filter((id) => ownedIds.has(id))
  const now = new Date().toISOString()
  await env.WOLTAR_DB.prepare(
    `INSERT INTO user_profiles (user_id, avatar, image_source, player_intro, writing_style, univers, tw, rhythm, ig_username, profile_public, linked_character_ids, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET avatar = excluded.avatar, image_source = excluded.image_source,
     player_intro = excluded.player_intro, writing_style = excluded.writing_style, univers = excluded.univers,
     tw = excluded.tw, rhythm = excluded.rhythm, ig_username = excluded.ig_username,
      profile_public = excluded.profile_public, linked_character_ids = excluded.linked_character_ids, updated_at = excluded.updated_at`,
    ).bind(userId, profile.avatar, profile.image_source, profile.player_intro, profile.writing_style, profile.univers, profile.tw, profile.rhythm, profile.ig_username, profile.profile_public ? 1 : 0, JSON.stringify(linkedCharacterIds), now, now).run()
  return getPlayerProfile(env, userId)
}

export async function deletePlayerProfile(env, userId) {
  await env.WOLTAR_DB.prepare('DELETE FROM user_profiles WHERE user_id = ?').bind(userId).run()
}

export async function listPublicPlayerProfiles(env) {
  const { results } = await env.WOLTAR_DB.prepare(
    `SELECT u.id, u.name, u.status, p.* FROM users u JOIN user_profiles p ON p.user_id = u.id
     WHERE p.profile_public = 1 AND u.disabled = 0 ORDER BY lower(u.name) ASC`,
  ).all()
  return Promise.all((results || []).map(async (row) => {
    const { results: characters } = await env.WOLTAR_DB.prepare(
      `SELECT id, data FROM characters WHERE owner_user_id = ? ORDER BY created_at ASC`,
    ).bind(row.id).all()
    const linkedIds = parseIds(row.linked_character_ids)
    const selectedIds = linkedIds.length > 0 ? linkedIds : (characters || []).map((character) => character.id)
    return {
      userId: row.id,
      name: row.name,
      status: row.status,
      profile: rowToProfile(row),
      characters: (characters || []).filter((character) => selectedIds.includes(character.id)).map((character) => {
        const data = JSON.parse(character.data)
        return { id: character.id, name: [data.firstName, data.lastName].filter(Boolean).join(' ') || data.name || character.id }
      }),
    }
  }))
}