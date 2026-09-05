// worker/lib/contentStore.js
//
// Collections statiques: lieux, clans, chronologie, archives, journal et
// configuration Aether restent empaquetees au build pour le moment.
//
// Personnages: la vue publique combine le canon statique et les personnages
// D1. Les anciennes lignes D1 portant l'id d'un personnage canon sont ignorees
// par defaut pour eviter qu'un ancien seed masque le JSON actuel. Une ligne D1
// ne peut remplacer/etendre une fiche canon que si `managed_by_admin = 1`, ce
// qui est pose par la nouvelle API admin de production.

import locationsJson from '../../src/data/locations.json' with { type: 'json' }
import clansJson from '../../src/data/clans.json' with { type: 'json' }
import eventsJson from '../../src/data/events.json' with { type: 'json' }
import archivesJson from '../../src/data/archives.json' with { type: 'json' }
import postsJson from '../../src/data/posts.json' with { type: 'json' }
import aetherJson from '../../src/data/aether.json' with { type: 'json' }
import staticCharactersJson from '../../src/data/characters.json' with { type: 'json' }
import timelinesJson from '../../src/data/timelines.json' with { type: 'json' }
import { normalizeTimelineEvents, resolveTimelineEvents } from '../../src/lib/timelineEvents.js'

// `clans` a ete retire de STATIC_COLLECTIONS : les clans peuvent desormais
// etre crees/modifies par un compte joueur (D1), voir listClansWithFallback
// ci-dessous. clansJson reste importe pour resoudre le canon (Nakamura).
export const STATIC_COLLECTIONS = {
  locations: locationsJson,
  events: eventsJson,
  archives: archivesJson,
}

export function getAetherConfig() {
  return (aetherJson && aetherJson[0]) || null
}

function bool(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function parseObjectJson(value, fallback = {}) {
  if (!value) return fallback
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function dataForStorage(row, id) {
  const data = { ...row, id }
  delete data.ownerUserId
  delete data.__managedByAdmin
  return data
}

function rowToRecord(row) {
  if (!row) return null
  const data = JSON.parse(row.data)
  const gallerySources = parseObjectJson(row.gallery_sources, data.gallery_sources || {})
  return {
    ...data,
    id: row.id,
    ownerUserId: row.owner_user_id,
    is_featured: row.is_featured === undefined ? bool(data.is_featured) : bool(row.is_featured),
    image_source: row.image_source ?? data.image_source ?? '',
    gallery_sources: gallerySources,
    __managedByAdmin: bool(row.managed_by_admin),
  }
}

function characterColumns(row, options = {}) {
  return {
    isFeatured: bool(row?.is_featured) ? 1 : 0,
    imageSource: String(row?.image_source || '').trim(),
    gallerySources: JSON.stringify(
      row?.gallery_sources && typeof row.gallery_sources === 'object' && !Array.isArray(row.gallery_sources)
        ? row.gallery_sources
        : {},
    ),
    managedByAdmin: (options.managedByAdmin || row?.__managedByAdmin) ? 1 : 0,
  }
}

export async function listCharacters(env) {
  const { results } = await env.WOLTAR_DB.prepare('SELECT * FROM characters ORDER BY created_at ASC').all()
  return (results || []).map(rowToRecord)
}

export async function getCharacter(env, id) {
  if (!id) return null
  const row = await env.WOLTAR_DB.prepare('SELECT * FROM characters WHERE id = ?').bind(id).first()
  return rowToRecord(row)
}

const TABLES = { characters: 'characters' }

export async function insertRow(env, collection, row, options = {}) {
  if (!TABLES[collection]) throw new Error(`Collection inconnue : ${collection}`)
  const now = new Date().toISOString()
  const { id, ownerUserId } = row
  const data = JSON.stringify(dataForStorage(row, id))
  const columns = characterColumns(row, options)

  await env.WOLTAR_DB.prepare(
    'INSERT INTO characters (id, owner_user_id, data, is_featured, image_source, gallery_sources, managed_by_admin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      ownerUserId || 'system',
      data,
      columns.isFeatured,
      columns.imageSource,
      columns.gallerySources,
      columns.managedByAdmin,
      now,
      now,
    )
    .run()
}

export async function updateRow(env, collection, id, row, options = {}) {
  if (!TABLES[collection]) throw new Error(`Collection inconnue : ${collection}`)
  const now = new Date().toISOString()
  const { ownerUserId } = row
  const data = JSON.stringify(dataForStorage(row, id))
  const columns = characterColumns(row, options)

  await env.WOLTAR_DB.prepare(
    'UPDATE characters SET owner_user_id = ?, data = ?, is_featured = ?, image_source = ?, gallery_sources = ?, managed_by_admin = ?, updated_at = ? WHERE id = ?',
  )
    .bind(
      ownerUserId || 'system',
      data,
      columns.isFeatured,
      columns.imageSource,
      columns.gallerySources,
      columns.managedByAdmin,
      now,
      id,
    )
    .run()
}

export async function deleteRow(env, collection, id) {
  const table = TABLES[collection]
  if (!table) throw new Error(`Collection inconnue : ${collection}`)
  await env.WOLTAR_DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()
}

async function safeGetCharacter(env, id) {
  try {
    return await getCharacter(env, id)
  } catch (err) {
    console.error('[contentStore] lecture D1 (personnage) impossible, repli sur les donnees statiques', err)
    return null
  }
}

async function safeListCharacters(env) {
  try {
    return await listCharacters(env)
  } catch (err) {
    console.error('[contentStore] liste D1 (personnages) impossible, repli sur les donnees statiques', err)
    return []
  }
}

function mergeAdminCharacter(staticRow, d1Row) {
  return {
    ...staticRow,
    ...d1Row,
    ownerUserId: d1Row.ownerUserId || staticRow.ownerUserId || 'system',
  }
}

export async function getCharacterWithFallback(env, id) {
  if (!id) return null
  const staticRow = staticCharactersJson.find((c) => c.id === id)
  const d1Row = await safeGetCharacter(env, id)
  if (!staticRow) return d1Row
  if (!d1Row) return staticRow
  return d1Row.__managedByAdmin ? mergeAdminCharacter(staticRow, d1Row) : staticRow
}

export async function listCharactersWithFallback(env) {
  const staticIds = new Set(staticCharactersJson.map((c) => c.id))
  const d1Rows = await safeListCharacters(env)
  const byId = new Map()

  for (const character of staticCharactersJson) byId.set(character.id, character)
  for (const character of d1Rows) {
    if (staticIds.has(character.id)) {
      if (character.__managedByAdmin) {
        byId.set(character.id, mergeAdminCharacter(byId.get(character.id), character))
      }
      continue
    }
    byId.set(character.id, character)
  }

  return [...byId.values()]
}

// --- Clans -----------------------------------------------------------------
//
// Meme schema de stockage que les personnages (id, owner_user_id, data JSON,
// horodatage) mais SANS les colonnes dediees (is_featured, image_source...)
// propres aux personnages -- volontairement des fonctions separees plutot
// qu'une generalisation de insertRow/updateRow/TABLES, pour ne rien casser
// de la logique personnages existante. Voir migrations/0004_clans_and_members.sql.

function clanDataForStorage(row, id) {
  const data = { ...row, id }
  delete data.ownerUserId
  return data
}

function clanRowToRecord(row) {
  if (!row) return null
  const data = JSON.parse(row.data)
  return { ...data, id: row.id, ownerUserId: row.owner_user_id }
}

export async function listClans(env) {
  const { results } = await env.WOLTAR_DB.prepare('SELECT * FROM clans ORDER BY created_at ASC').all()
  return (results || []).map(clanRowToRecord)
}

export async function getClan(env, id) {
  if (!id) return null
  const row = await env.WOLTAR_DB.prepare('SELECT * FROM clans WHERE id = ?').bind(id).first()
  return clanRowToRecord(row)
}

export async function insertClan(env, row) {
  const now = new Date().toISOString()
  const { id, ownerUserId } = row
  const data = JSON.stringify(clanDataForStorage(row, id))
  await env.WOLTAR_DB.prepare(
    'INSERT INTO clans (id, owner_user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, ownerUserId || 'system', data, now, now)
    .run()
}

export async function updateClan(env, id, row) {
  const now = new Date().toISOString()
  const { ownerUserId } = row
  const data = JSON.stringify(clanDataForStorage(row, id))
  await env.WOLTAR_DB.prepare('UPDATE clans SET owner_user_id = ?, data = ?, updated_at = ? WHERE id = ?')
    .bind(ownerUserId || 'system', data, now, id)
    .run()
}

export async function deleteClan(env, id) {
  await env.WOLTAR_DB.prepare('DELETE FROM clans WHERE id = ?').bind(id).run()
  await env.WOLTAR_DB.prepare('DELETE FROM clan_members WHERE clan_id = ?').bind(id).run()
}

export async function listClanMembers(env, clanId) {
  const { results } = await env.WOLTAR_DB.prepare(
    'SELECT * FROM clan_members WHERE clan_id = ? ORDER BY display_order ASC, added_at ASC',
  )
    .bind(clanId)
    .all()
  return (results || []).map((r) => ({
    clanId: r.clan_id,
    characterId: r.character_id,
    role: r.role || '',
    order: r.display_order || 0,
    addedAt: r.added_at,
  }))
}

export async function addClanMember(env, clanId, characterId, { role = '', order = 0 } = {}) {
  const now = new Date().toISOString()
  await env.WOLTAR_DB.prepare(
    `INSERT INTO clan_members (clan_id, character_id, role, display_order, added_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(clan_id, character_id) DO UPDATE SET role = excluded.role, display_order = excluded.display_order`,
  )
    .bind(clanId, characterId, role, order, now)
    .run()
}

export async function removeClanMember(env, clanId, characterId) {
  await env.WOLTAR_DB.prepare('DELETE FROM clan_members WHERE clan_id = ? AND character_id = ?')
    .bind(clanId, characterId)
    .run()
}

async function safeGetClan(env, id) {
  try {
    return await getClan(env, id)
  } catch (err) {
    console.error('[contentStore] lecture D1 (clan) impossible, repli sur les donnees statiques', err)
    return null
  }
}

async function safeListClans(env) {
  try {
    return await listClans(env)
  } catch (err) {
    console.error('[contentStore] liste D1 (clans) impossible, repli sur les donnees statiques', err)
    return []
  }
}

async function safeListClanMembers(env, clanId) {
  try {
    return await listClanMembers(env, clanId)
  } catch (err) {
    console.error('[contentStore] lecture D1 (membres de clan) impossible', err)
    return []
  }
}

// Un clan "canon" (ownerUserId absent ou 'system') garde ses membres tels
// qu'embarques dans clans.json (`members: [...]`, gere depuis /admin). Un
// clan cree par un compte joueur n'a pas ce tableau : ses membres viennent
// de la table clan_members.
async function resolveClanMembers(env, clan) {
  if (!clan) return []
  if (!clan.ownerUserId || clan.ownerUserId === 'system') return clan.members || []
  const rows = await safeListClanMembers(env, clan.id)
  return rows.map((r) => r.characterId)
}

export async function getClanWithFallback(env, id) {
  if (!id) return null
  const staticRow = clansJson.find((c) => c.id === id)
  const d1Row = await safeGetClan(env, id)
  const clan = staticRow || d1Row
  if (!clan) return null
  const members = await resolveClanMembers(env, clan)
  return { ...clan, members }
}

export async function listClansWithFallback(env) {
  const staticIds = new Set(clansJson.map((c) => c.id))
  const d1Rows = await safeListClans(env)
  const byId = new Map()

  for (const clan of clansJson) byId.set(clan.id, clan)
  for (const clan of d1Rows) {
    // Le canon reste prioritaire ; un clan D1 ne peut pas usurper un id canon.
    if (staticIds.has(clan.id)) continue
    byId.set(clan.id, clan)
  }

  const clans = [...byId.values()]
  return Promise.all(clans.map(async (clan) => ({ ...clan, members: await resolveClanMembers(env, clan) })))
}

// --- Lieux de comptes -----------------------------------------------------

function locationDataForStorage(row, id) {
  const data = { ...row, id }
  delete data.ownerUserId
  return data
}

function locationRowToRecord(row) {
  if (!row) return null
  return { ...JSON.parse(row.data), id: row.id, ownerUserId: row.owner_user_id }
}

export async function listLocations(env) {
  const { results } = await env.WOLTAR_DB.prepare('SELECT * FROM locations ORDER BY created_at ASC').all()
  return (results || []).map(locationRowToRecord)
}

export async function getLocation(env, id) {
  if (!id) return null
  const row = await env.WOLTAR_DB.prepare('SELECT * FROM locations WHERE id = ?').bind(id).first()
  return locationRowToRecord(row)
}

export async function insertLocation(env, row) {
  const now = new Date().toISOString()
  const data = JSON.stringify(locationDataForStorage(row, row.id))
  await env.WOLTAR_DB.prepare(
    'INSERT INTO locations (id, owner_user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(row.id, row.ownerUserId || 'system', data, now, now)
    .run()
}

export async function updateLocation(env, id, row) {
  const now = new Date().toISOString()
  await env.WOLTAR_DB.prepare('UPDATE locations SET owner_user_id = ?, data = ?, updated_at = ? WHERE id = ?')
    .bind(row.ownerUserId || 'system', JSON.stringify(locationDataForStorage(row, id)), now, id)
    .run()
}

export async function deleteLocation(env, id) {
  await env.WOLTAR_DB.prepare('DELETE FROM locations WHERE id = ?').bind(id).run()
}

export async function getLocationWithFallback(env, id) {
  const staticRow = locationsJson.find((location) => location.id === id)
  const d1Row = await getLocation(env, id)
  return staticRow || d1Row
}

export async function listLocationsWithFallback(env) {
  const d1Rows = await listLocations(env)
  const byId = new Map(locationsJson.map((location) => [location.id, location]))
  for (const location of d1Rows) {
    if (!byId.has(location.id)) byId.set(location.id, location)
  }
  return [...byId.values()]
}

// --- Articles de journal de comptes ---------------------------------------

function postDataForStorage(row, id) {
  const data = { ...row, id }
  delete data.ownerUserId
  return data
}

function postRowToRecord(row) {
  if (!row) return null
  return { ...JSON.parse(row.data), id: row.id, ownerUserId: row.owner_user_id }
}

export async function listPosts(env) {
  const { results } = await env.WOLTAR_DB.prepare('SELECT * FROM posts ORDER BY created_at ASC').all()
  return (results || []).map(postRowToRecord)
}

export async function getPost(env, id) {
  if (!id) return null
  const row = await env.WOLTAR_DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first()
  return postRowToRecord(row)
}

export async function insertPost(env, row) {
  const now = new Date().toISOString()
  await env.WOLTAR_DB.prepare('INSERT INTO posts (id, owner_user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(row.id, row.ownerUserId, JSON.stringify(postDataForStorage(row, row.id)), now, now)
    .run()
}

export async function updatePost(env, id, row) {
  const now = new Date().toISOString()
  await env.WOLTAR_DB.prepare('UPDATE posts SET owner_user_id = ?, data = ?, updated_at = ? WHERE id = ?')
    .bind(row.ownerUserId, JSON.stringify(postDataForStorage(row, id)), now, id)
    .run()
}

export async function deletePost(env, id) {
  await env.WOLTAR_DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run()
}

export async function getPostWithFallback(env, id) {
  return postsJson.find((post) => post.id === id) || getPost(env, id)
}

export async function listPostsWithFallback(env) {
  const byId = new Map(postsJson.map((post) => [post.id, post]))
  for (const post of await listPosts(env)) if (!byId.has(post.id)) byId.set(post.id, post)
  return [...byId.values()]
}

// --- Chronologies (timelines) de comptes ------------------------------------
//
// Meme schema de stockage que locations/posts : id, owner_user_id, data JSON,
// horodatage. La chronologie canon (Nakamura) n'a PAS de ligne ici tant
// qu'aucun compte ne la revendique — voir timelinesJson (metadonnees) et
// resolveTimelineEvents (src/lib/timelineEvents.js) pour ses evenements, qui
// restent ceux de src/data/events.json, jamais dupliques ici.

function timelineDataForStorage(row, id) {
  const data = { ...row, id }
  delete data.ownerUserId
  return data
}

function timelineRowToRecord(row) {
  if (!row) return null
  return { ...JSON.parse(row.data), id: row.id, ownerUserId: row.owner_user_id }
}

export async function listTimelines(env) {
  const { results } = await env.WOLTAR_DB.prepare('SELECT * FROM timelines ORDER BY created_at ASC').all()
  return (results || []).map(timelineRowToRecord)
}

export async function getTimeline(env, id) {
  if (!id) return null
  const row = await env.WOLTAR_DB.prepare('SELECT * FROM timelines WHERE id = ?').bind(id).first()
  return timelineRowToRecord(row)
}

export async function insertTimeline(env, row) {
  const now = new Date().toISOString()
  const data = JSON.stringify(timelineDataForStorage(row, row.id))
  await env.WOLTAR_DB.prepare(
    'INSERT INTO timelines (id, owner_user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(row.id, row.ownerUserId || 'system', data, now, now)
    .run()
}

export async function updateTimeline(env, id, row) {
  const now = new Date().toISOString()
  await env.WOLTAR_DB.prepare('UPDATE timelines SET owner_user_id = ?, data = ?, updated_at = ? WHERE id = ?')
    .bind(row.ownerUserId || 'system', JSON.stringify(timelineDataForStorage(row, id)), now, id)
    .run()
}

export async function deleteTimeline(env, id) {
  await env.WOLTAR_DB.prepare('DELETE FROM timelines WHERE id = ?').bind(id).run()
}

async function safeListTimelines(env) {
  try {
    return await listTimelines(env)
  } catch (err) {
    console.error('[contentStore] liste D1 (chronologies) impossible, repli sur le canon', err)
    return []
  }
}

async function safeGetTimeline(env, id) {
  try {
    return await getTimeline(env, id)
  } catch (err) {
    console.error('[contentStore] lecture D1 (chronologie) impossible, repli sur le canon', err)
    return null
  }
}

export async function getTimelineWithFallback(env, id) {
  if (!id) return null
  const staticRow = timelinesJson.find((timeline) => timeline.id === id)
  const d1Row = staticRow ? null : await safeGetTimeline(env, id)
  const timeline = staticRow || d1Row
  if (!timeline) return null
  return { ...timeline, events: resolveTimelineEvents(timeline, eventsJson) }
}

export async function listTimelinesWithFallback(env) {
  const staticIds = new Set(timelinesJson.map((timeline) => timeline.id))
  const d1Rows = await safeListTimelines(env)
  const byId = new Map()

  for (const timeline of timelinesJson) byId.set(timeline.id, timeline)
  for (const timeline of d1Rows) {
    // Le canon reste prioritaire ; une chronologie D1 ne peut pas usurper un
    // id canon (deja bloque cote ecriture, voir worker/routes/account.js).
    if (staticIds.has(timeline.id)) continue
    byId.set(timeline.id, timeline)
  }

  return [...byId.values()].map((timeline) => ({ ...timeline, events: resolveTimelineEvents(timeline, eventsJson) }))
}

export { normalizeTimelineEvents }
