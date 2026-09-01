// worker/lib/contentStore.js
//
// Lieux / clans / chronologie / archives / journal / configuration Aether
// restent statiques (empaquetés au build, lecture seule en production — voir
// docs/CLOUDFLARE_DEPLOYMENT_PLAN.md, section « Portée retenue »).
//
// Personnages : depuis la tâche « Séparer canon local et personnages
// utilisateurs D1 » (Phase 18), la séparation est stricte —
//   - CANON (personnages historiques ou créés par l'admin en local) : vit
//     uniquement dans src/data/characters.json, édité en localhost via
//     l'admin dev (plugins/woltar-admin.js), publié par build + déploiement.
//     Ne vit JAMAIS dans D1 — voir docs/CLOUDFLARE_DEPLOYMENT_PLAN.md.
//   - UTILISATEUR (créé depuis /compte en production) : vit uniquement dans
//     D1, `ownerUserId` = l'id du compte créateur.
//
// getCharacterWithFallback/listCharactersWithFallback construisent la vue
// publique unifiée : le JSON statique (canon) est TOUJOURS prioritaire — un
// id canon n'est jamais remplacé ni masqué par une ligne D1 du même id,
// même si D1 en contient une (résidu d'un ancien seed, par exemple). Seules
// les lignes D1 dont l'id ne correspond à aucun personnage canon sont
// ajoutées à la vue (= les personnages utilisateurs). Ça garantit aussi que
// les fiches canon restent visibles même si D1 est indisponible, en panne,
// ou pas encore peuplé : leur lecture ne dépend plus de D1 du tout.
//
// Historique — Phase « Aether » : la table D1 `personas` et toute la
// logique de lecture/écriture associée (get/listPersonas,
// get/listPersonasWithFallback) ont été retirées d'ici : le système de
// Personas RP liées à un personnage est supprimé au profit d'AETHER, un
// assistant IA central unique (config statique, voir STATIC_COLLECTIONS.aether
// et worker/routes/aether.js). La table `personas` reste présente sur le
// disque D1 tant qu'elle n'a pas été explicitement supprimée par
// l'utilisatrice/Codex — voir migrations/0002_deprecate_personas.sql (non
// appliquée).

import locationsJson from '../../src/data/locations.json'
import clansJson from '../../src/data/clans.json'
import eventsJson from '../../src/data/events.json'
import archivesJson from '../../src/data/archives.json'
import postsJson from '../../src/data/posts.json'
import aetherJson from '../../src/data/aether.json'
import staticCharactersJson from '../../src/data/characters.json'

export const STATIC_COLLECTIONS = {
  locations: locationsJson,
  clans: clansJson,
  events: eventsJson,
  archives: archivesJson,
  posts: postsJson,
}

// Config Aether : un seul objet, jamais une liste dans le reste du code —
// voir worker/routes/aether.js. Édité comme les autres collections de
// référence via l'admin local (src/admin/schema.js, collection singleton
// `aether`), publié par build + déploiement, jamais stocké en D1.
export function getAetherConfig() {
  return (aetherJson && aetherJson[0]) || null
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

const TABLES = { characters: 'characters' }

export async function insertRow(env, collection, row) {
  if (!TABLES[collection]) throw new Error(`Collection inconnue : ${collection}`)
  const now = new Date().toISOString()
  const { id, ownerUserId, ...rest } = row
  const data = JSON.stringify({ ...rest, id })

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

async function safeListCharacters(env) {
  try {
    return await listCharacters(env)
  } catch (err) {
    console.error('[contentStore] liste D1 (personnages) impossible, repli sur les données statiques', err)
    return []
  }
}

// Le canon (JSON statique) est toujours prioritaire — jamais interrogé après
// D1, jamais remplacé par une ligne D1 du même id. Une fiche canon reste
// donc lisible même si D1 est en panne, indisponible, ou pas encore
// peuplée : sa lecture ne fait plus aucun appel réseau.
export async function getCharacterWithFallback(env, id) {
  if (!id) return null
  const staticRow = staticCharactersJson.find((c) => c.id === id)
  if (staticRow) return staticRow
  return await safeGetCharacter(env, id)
}

// Vue unifiée : tout le canon + uniquement les lignes D1 dont l'id n'est
// pas un id canon (= personnages utilisateurs). Une ligne D1 qui porterait
// malgré tout un id canon (résidu d'un ancien seed, `ownerUserId: "system"`
// legacy...) est ignorée sans exception — jamais mélangée à la fiche canon
// correspondante, jamais affichée en double.
export async function listCharactersWithFallback(env) {
  const staticIds = new Set(staticCharactersJson.map((c) => c.id))
  const d1Rows = await safeListCharacters(env)
  const byId = new Map()
  for (const c of staticCharactersJson) byId.set(c.id, c)
  for (const c of d1Rows) {
    if (staticIds.has(c.id)) continue
    byId.set(c.id, c)
  }
  return [...byId.values()]
}
