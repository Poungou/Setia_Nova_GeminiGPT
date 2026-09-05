import { listCharactersWithFallback } from './contentStore.js'
import { isCharacterLinked, validateCharacterLinks } from '../../src/lib/characterLinks.js'

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

export async function savePlayerProfile(env, userId, payload, options = {}) {
  const user = await env.WOLTAR_DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
  if (!user) throw Object.assign(new Error('Ce compte est introuvable.'), { status: 404 })
  const previous = await getPlayerProfile(env, userId)
  const profile = normalizePlayerProfile({ ...previous, ...payload })
  const characters = await listCharactersWithFallback(env)
  const linkedCharacterIds = payload.linked_character_ids === undefined
    ? previous.linked_character_ids
    : validateCharacterLinks(payload.linked_character_ids, characters, userId, previous.linked_character_ids, options)
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
  const characters = await listCharactersWithFallback(env)
  return (results || []).map((row) => {
    const linkedIds = parseIds(row.linked_character_ids)
    const visible = characters.filter((character) => character.visibility !== 'draft' && isCharacterLinked(character, row.id, linkedIds))
    return {
      userId: row.id,
      name: row.name,
      status: row.status,
      profile: { ...rowToProfile(row), linked_character_ids: linkedIds.filter((id) => visible.some((character) => character.id === id)) },
      characters: visible.map((character) => ({ id: character.id, name: [character.firstName, character.lastName].filter(Boolean).join(' ') || character.name || character.id })),
    }
  })
}
