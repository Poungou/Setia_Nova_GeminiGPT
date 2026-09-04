// worker/routes/admin.js
//
// API admin de production, protegee par session + role admin. Les ecritures
// persistantes D1 introduites ici concernent le profil createur et les
// personnages. Les autres collections restent servies en lecture depuis le
// bundle statique tant qu'elles ne sont pas migrees.

import { getRequestUser, httpError, isAdmin } from '../lib/authStore.js'
import { getCharacter, insertRow, listCharactersWithFallback, updateRow } from '../lib/contentStore.js'
import homeJson from '../../src/data/home.json' with { type: 'json' }
import locationsJson from '../../src/data/locations.json' with { type: 'json' }
import clansJson from '../../src/data/clans.json' with { type: 'json' }
import eventsJson from '../../src/data/events.json' with { type: 'json' }
import archivesJson from '../../src/data/archives.json' with { type: 'json' }
import postsJson from '../../src/data/posts.json' with { type: 'json' }
import aetherJson from '../../src/data/aether.json' with { type: 'json' }
import staticCharactersJson from '../../src/data/characters.json' with { type: 'json' }

const STATIC_COLLECTIONS = {
  home: homeJson,
  locations: locationsJson,
  clans: clansJson,
  events: eventsJson,
  archives: archivesJson,
  posts: postsJson,
  aether: aetherJson,
}

const COLLECTIONS = new Set(['characters', ...Object.keys(STATIC_COLLECTIONS)])
const STATIC_CHARACTER_IDS = new Set(staticCharactersJson.map((character) => character.id))

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  })
}

async function readJson(request) {
  const raw = await request.text()
  return raw ? JSON.parse(raw) : {}
}

function bool(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function normalizeGallerySources(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeCharacter(row, existing = null) {
  const id = String(row?.id || existing?.id || '').trim()
  if (!id) throw httpError(400, 'Identifiant de personnage manquant.')

  return {
    ...(existing || {}),
    ...(row || {}),
    id,
    ownerUserId: row?.ownerUserId || existing?.ownerUserId || 'system',
    is_featured: bool(row?.is_featured),
    image_source: String(row?.image_source || '').trim(),
    gallery_sources: normalizeGallerySources(row?.gallery_sources),
    __managedByAdmin: true,
  }
}

async function saveCharacters(env, rows) {
  if (!Array.isArray(rows)) throw httpError(400, 'Tableau attendu.')

  const seen = new Set()
  const saved = []
  for (const row of rows) {
    const id = String(row?.id || '').trim()
    if (!id) throw httpError(400, 'Identifiant de personnage manquant.')
    if (seen.has(id)) throw httpError(400, `Identifiant duplique : ${id}`)
    seen.add(id)

    const existing = await getCharacter(env, id)
    const clean = normalizeCharacter(row, existing)
    if (STATIC_CHARACTER_IDS.has(id)) clean.ownerUserId = 'system'

    if (existing) {
      await updateRow(env, 'characters', id, clean, { managedByAdmin: true })
    } else {
      await insertRow(env, 'characters', clean, { managedByAdmin: true })
    }
    saved.push(clean)
  }
  return saved
}

// `parts` = segments apres /__admin/api/ (ex: ['collections','characters']).
export async function handleAdmin(request, env, parts) {
  try {
    const user = await getRequestUser(env, request)
    if (!user) throw httpError(401, 'Connexion requise.')
    if (!isAdmin(user)) throw httpError(403, 'Reserve admin.')

    if (parts[0] === 'collections') {
      const name = parts[1]
      if (!COLLECTIONS.has(name)) return json({ error: 'Collection inconnue' }, { status: 404 })

      if (request.method === 'GET' && parts.length === 2) {
        if (name === 'characters') return json({ data: await listCharactersWithFallback(env) })
        return json({ data: STATIC_COLLECTIONS[name] || [] })
      }

      if (request.method === 'PUT' && parts.length === 2) {
        const rows = await readJson(request)
        if (!Array.isArray(rows)) throw httpError(400, 'Tableau attendu.')

        if (name === 'characters') {
          const saved = await saveCharacters(env, rows)
          return json({ ok: true, count: saved.length, data: saved })
        }

        throw httpError(403, 'Cette collection reste geree par les fichiers statiques et un deploiement.')
      }

      return json({ error: 'Methode non autorisee' }, { status: 405 })
    }

    if (parts[0] === 'upload') {
      throw httpError(501, 'Upload distant non configure. Utilise un chemin /media/... existant ou une URL.')
    }

    return json({ error: 'Route inconnue' }, { status: 404 })
  } catch (err) {
    const status = err?.status || 500
    if (status >= 500) console.error('[worker/admin]', err)
    return json({ error: err?.message || 'Erreur admin.' }, { status })
  }
}
