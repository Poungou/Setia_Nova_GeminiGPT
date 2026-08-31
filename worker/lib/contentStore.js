// worker/lib/contentStore.js
//
// Lieux / clans / chronologie / archives / journal restent statiques pour
// l'instant (empaquetés au build, lecture seule en production — voir
// docs/CLOUDFLARE_DEPLOYMENT_PLAN.md, section « Portée retenue »). Seuls
// personnages et Personas vivent dans D1 : ce sont les deux seules
// collections qu'un compte utilisateur (ou l'admin, via /compte) doit
// pouvoir modifier une fois le site en ligne.
//
// Les fonctions `*WithFallback` ci-dessous cherchent d'abord dans D1, puis
// retombent sur les fiches statiques (src/data/characters.json,
// personas.json) si D1 ne répond rien pour cet id — ou si D1 lève une
// erreur (table pas encore migrée, binding mal configuré...). C'est ce qui
// garantit que les personnages historiques (Fudo, Kazuko...) restent
// utilisables — y compris pour le chat IA — pendant toute la migration,
// même avant que la base D1 soit entièrement peuplée.

import locationsJson from '../../src/data/locations.json'
import clansJson from '../../src/data/clans.json'
import eventsJson from '../../src/data/events.json'
import archivesJson from '../../src/data/archives.json'
import postsJson from '../../src/data/posts.json'
import staticCharactersJson from '../../src/data/characters.json'
import staticPersonasJson from '../../src/data/personas.json'

export const STATIC_COLLECTIONS = {
  locations: locationsJson,
  clans: clansJson,
  events: eventsJson,
  archives: archivesJson,
  posts: postsJson,
}

function rowToRecord(row) {
  if (!row) return null
  return { ...JSON.parse(row.data), id: row.id, ownerUserId: row.owner_user_id }
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

export async function listPersonas(env) {
  const { results } = await env.WOLTAR_DB.prepare('SELECT * FROM personas ORDER BY created_at ASC').all()
  return (results || []).map(rowToRecord)
}

export async function getPersona(env, id) {
  if (!id) return null
  const row = await env.WOLTAR_DB.prepare('SELECT * FROM personas WHERE id = ?').bind(id).first()
  return rowToRecord(row)
}

const TABLES = { characters: 'characters', personas: 'personas' }

export async function insertRow(env, collection, row) {
  if (!TABLES[collection]) throw new Error(`Collection inconnue : ${collection}`)
  const now = new Date().toISOString()
  const { id, ownerUserId, ...rest } = row
  const data = JSON.stringify({ ...rest, id })

  if (collection === 'personas') {
    await env.WOLTAR_DB.prepare(
      'INSERT INTO personas (id, character_id, owner_user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(id, row.characterId || '', ownerUserId || 'system', data, now, now)
      .run()
    return
  }

  await env.WOLTAR_DB.prepare(
    'INSERT INTO characters (id, owner_user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, ownerUserId || 'system', data, now, now)
    .run()
}

export async function updateRow(env, collection, id, row) {
  if (!TABLES[collection]) throw new Error(`Collection inconnue : ${collection}`)
  const now = new Date().toISOString()
  const { ownerUserId, ...rest } = row
  const data = JSON.stringify({ ...rest, id })

  if (collection === 'personas') {
    await env.WOLTAR_DB.prepare(
      'UPDATE personas SET character_id = ?, owner_user_id = ?, data = ?, updated_at = ? WHERE id = ?',
    )
      .bind(row.characterId || '', ownerUserId || 'system', data, now, id)
      .run()
    return
  }

  await env.WOLTAR_DB.prepare('UPDATE characters SET owner_user_id = ?, data = ?, updated_at = ? WHERE id = ?')
    .bind(ownerUserId || 'system', data, now, id)
    .run()
}

export async function deleteRow(env, collection, id) {
  const table = TABLES[collection]
  if (!table) throw new Error(`Collection inconnue : ${collection}`)
  await env.WOLTAR_DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()
}

// --- Lecture résiliente (D1 + repli statique) ------------------------------

async function safeGetCharacter(env, id) {
  try {
    return await getCharacter(env, id)
  } catch (err) {
    console.error('[contentStore] lecture D1 (personnage) impossible, repli sur les données statiques', err)
    return null
  }
}

async function safeGetPersona(env, id) {
  try {
    return await getPersona(env, id)
  } catch (err) {
    console.error('[contentStore] lecture D1 (Persona) impossible, repli sur les données statiques', err)
    return null
  }
}

async function safeListCharacters(env) {
  try {
    return await listCharacters(env)
  } catch (err) {
    console.error('[contentStore] liste D1 (personnages) impossible, repli sur les données statiques', err)
    return []
  }
}

async function safeListPersonas(env) {
  try {
    return await listPersonas(env)
  } catch (err) {
    console.error('[contentStore] liste D1 (Personas) impossible, repli sur les données statiques', err)
    return []
  }
}

// D1 gagne quand la même fiche existe des deux côtés (donnée plus fraîche).
export async function getCharacterWithFallback(env, id) {
  if (!id) return null
  const row = await safeGetCharacter(env, id)
  if (row) return row
  return staticCharactersJson.find((c) => c.id === id) || null
}

export async function getPersonaWithFallback(env, id) {
  if (!id) return null
  const row = await safeGetPersona(env, id)
  if (row) return row
  return staticPersonasJson.find((p) => p.id === id) || null
}

export async function listCharactersWithFallback(env) {
  const d1Rows = await safeListCharacters(env)
  const byId = new Map()
  for (const c of staticCharactersJson) byId.set(c.id, c)
  for (const c of d1Rows) byId.set(c.id, c)
  return [...byId.values()]
}

export async function listPersonasWithFallback(env) {
  const d1Rows = await safeListPersonas(env)
  const byId = new Map()
  for (const p of staticPersonasJson) byId.set(p.id, p)
  for (const p of d1Rows) byId.set(p.id, p)
  return [...byId.values()]
}
