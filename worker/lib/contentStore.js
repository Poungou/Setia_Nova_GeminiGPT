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

import locationsJson from '../../src/data/locations.json'
import clansJson from '../../src/data/clans.json'
import eventsJson from '../../src/data/events.json'
import archivesJson from '../../src/data/archives.json'
import postsJson from '../../src/data/posts.json'
import aetherJson from '../../src/data/aether.json'
import staticCharactersJson from '../../src/data/characters.json'
import { creatorProfile, normalizeCreatorProfile } from '../../src/data/creator.js'

export const STATIC_COLLECTIONS = {
  locations: locationsJson,
  clans: clansJson,
  events: eventsJson,
  archives: archivesJson,
  posts: postsJson,
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

export async function getSiteSetting(env, key, fallback = null) {
  const row = await env.WOLTAR_DB.prepare('SELECT data FROM site_settings WHERE key = ?').bind(key).first()
  if (!row) return fallback
  return JSON.parse(row.data)
}

export async function upsertSiteSetting(env, key, data) {
  const now = new Date().toISOString()
  await env.WOLTAR_DB.prepare(
    'INSERT INTO site_settings (key, data, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
  )
    .bind(key, JSON.stringify(data), now, now)
    .run()
}

export async function getCreatorProfile(env) {
  try {
    return normalizeCreatorProfile(await getSiteSetting(env, 'creator_profile', creatorProfile))
  } catch (err) {
    console.error('[contentStore] lecture D1 (profil createur) impossible, repli statique', err)
    return creatorProfile
  }
}

export async function saveCreatorProfile(env, profile) {
  const clean = normalizeCreatorProfile(profile)
  await upsertSiteSetting(env, 'creator_profile', clean)
  return clean
}
