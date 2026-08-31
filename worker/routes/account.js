// worker/routes/account.js
//
// Port Cloudflare Worker de plugins/woltar-account.js. Même règle centrale :
// un compte ne peut créer/modifier/supprimer que ses propres personnages et
// Personas (ownerUserId) ; les 5 collections de référence (lieux, clans,
// chronologie, archives, journal) restent en lecture seule, empaquetées au
// build — voir worker/lib/contentStore.js et docs/CLOUDFLARE_DEPLOYMENT_PLAN.md,
// section « Portée retenue ».

import { canEditOwnedResource, getOwnerUserId, getRequestUser, httpError } from '../lib/authStore.js'
import {
  STATIC_COLLECTIONS,
  deleteRow,
  getCharacter,
  getPersona,
  insertRow,
  listCharacters,
  listPersonas,
  updateRow,
} from '../lib/contentStore.js'

const OWNED_COLLECTIONS = new Set(['characters', 'personas'])
const REFERENCE_COLLECTIONS = ['locations', 'clans', 'events', 'archives', 'posts']

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

function ownRows(rows, user) {
  return rows.filter((row) => getOwnerUserId(row) === user.id)
}

function assertOwnedCollection(name) {
  if (!OWNED_COLLECTIONS.has(name)) {
    throw httpError(403, 'Cette collection est réservée à l’administration.')
  }
}

function assertCanEdit(user, row) {
  if (!canEditOwnedResource(user, row)) throw httpError(403, 'Tu ne peux modifier que tes propres contenus.')
}

function assertId(row) {
  if (!row?.id || typeof row.id !== 'string') throw httpError(400, 'Identifiant manquant.')
}

async function listRows(env, name) {
  return name === 'personas' ? listPersonas(env) : listCharacters(env)
}

async function getRow(env, name, id) {
  return name === 'personas' ? getPersona(env, id) : getCharacter(env, id)
}

async function sanitizeOwnedRow(env, name, row, user, existing = null) {
  const clean = { ...row, ownerUserId: user.id }
  const now = new Date().toISOString()
  clean.updatedAt = now

  if (existing) {
    assertCanEdit(user, existing)
    clean.id = existing.id
    clean.ownerUserId = getOwnerUserId(existing)
  }

  if (name === 'characters') {
    assertId(clean)
    if (!clean.author) clean.author = user.name || user.email
    return clean
  }

  if (name === 'personas') {
    const characterId = String(clean.characterId || '').trim()
    if (!characterId) throw httpError(400, 'Choisis un personnage associé.')
    if (existing && characterId !== existing.characterId) {
      throw httpError(400, 'Pour changer de personnage associé, crée une nouvelle Persona.')
    }

    const character = await getCharacter(env, characterId)
    if (!character) throw httpError(404, 'Fiche personnage associée introuvable.')
    if (getOwnerUserId(character) !== user.id) {
      throw httpError(403, 'Tu peux créer une Persona uniquement pour tes propres personnages.')
    }

    clean.characterId = characterId
    clean.id = existing?.id || characterId
    return clean
  }

  throw httpError(403, 'Collection non autorisée.')
}

// `parts` = segments du chemin après /__account/api/ (ex: ['collections','characters']).
export async function handleAccount(request, env, parts) {
  try {
    const user = await getRequestUser(env, request)
    if (!user) throw httpError(401, 'Connexion requise.')

    const method = request.method

    if (parts[0] === 'bootstrap' && method === 'GET') {
      const [characters, personas] = await Promise.all([listCharacters(env), listPersonas(env)])
      const data = {
        characters: ownRows(characters, user),
        personas: ownRows(personas, user),
      }
      for (const name of REFERENCE_COLLECTIONS) data[name] = STATIC_COLLECTIONS[name] || []
      return json({ user, data })
    }

    if (parts[0] === 'collections') {
      const name = parts[1]
      assertOwnedCollection(name)

      if (method === 'GET' && parts.length === 2) {
        const rows = await listRows(env, name)
        return json({ data: ownRows(rows, user) })
      }

      if (method === 'POST' && parts.length === 2) {
        const clean = await sanitizeOwnedRow(env, name, await readJson(request), user)
        const existing = await getRow(env, name, clean.id)
        if (existing) throw httpError(409, 'Cet identifiant existe déjà.')
        await insertRow(env, name, clean)
        return json({ row: clean })
      }

      if ((method === 'PUT' || method === 'DELETE') && parts[2]) {
        const id = decodeURIComponent(parts[2])
        const existing = await getRow(env, name, id)
        if (!existing) throw httpError(404, 'Fiche introuvable.')
        assertCanEdit(user, existing)

        if (method === 'PUT') {
          const clean = await sanitizeOwnedRow(env, name, await readJson(request), user, existing)
          await updateRow(env, name, id, clean)
          return json({ row: clean })
        }

        await deleteRow(env, name, id)

        if (name === 'characters') {
          const personas = await listPersonas(env)
          const toDelete = personas.filter(
            (persona) => persona.characterId === id && getOwnerUserId(persona) === user.id,
          )
          for (const persona of toDelete) await deleteRow(env, 'personas', persona.id)
        }

        return json({ ok: true })
      }
    }

    return json({ error: 'Route inconnue' }, { status: 404 })
  } catch (err) {
    const status = err?.status || 500
    if (status >= 500) console.error('[worker/account]', err)
    return json({ error: err?.message || 'Erreur compte.' }, { status })
  }
}
