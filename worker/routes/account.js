// worker/routes/account.js
//
// Port Cloudflare Worker de plugins/woltar-account.js. Un compte ne peut
// créer/modifier/supprimer que ses propres personnages (ownerUserId) ; les
// collections de référence (lieux, clans, chronologie, archives, journal)
// restent en lecture seule, empaquetées au build — voir
// worker/lib/contentStore.js et docs/CLOUDFLARE_DEPLOYMENT_PLAN.md, section
// « Portée retenue ».
//
// Historique — tâche « Aether » : la collection `personas` (Personas RP
// liées à un personnage, gérables depuis /compte) a été retirée d'ici. Le
// site n'a plus qu'un seul assistant IA central, AETHER (config statique,
// non liée à un compte) — voir worker/routes/aether.js.

import { getOwnerUserId, getRequestUser, httpError } from '../lib/authStore.js'
import { STATIC_COLLECTIONS, deleteRow, getCharacter, insertRow, listCharacters, updateRow } from '../lib/contentStore.js'
import staticCharactersJson from '../../src/data/characters.json'

const REFERENCE_COLLECTIONS = Object.keys(STATIC_COLLECTIONS)
// Un compte ne peut jamais créer un personnage qui porte l'id d'une fiche
// canon (src/data/characters.json) — même si D1 ne contient rien pour cet
// id. Voir worker/lib/contentStore.js : le canon reste prioritaire à la
// lecture de toute façon, mais autoriser la création éviterait juste une
// fiche D1 fantôme, jamais affichée nulle part — mieux vaut refuser
// clairement plutôt que laisser un identifiant piégé.
const CANON_CHARACTER_IDS = new Set(staticCharactersJson.map((c) => c.id))

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
  if (name !== 'characters') {
    throw httpError(403, 'Cette collection est réservée à l’administration.')
  }
}

function assertCanEdit(user, row) {
  if (!user?.id || getOwnerUserId(row) !== user.id) {
    throw httpError(403, 'Tu ne peux modifier que tes propres contenus.')
  }
}

function assertId(row) {
  if (!row?.id || typeof row.id !== 'string') throw httpError(400, 'Identifiant manquant.')
}

function sanitizeOwnedRow(row, user, existing = null) {
  const clean = {
    ...row,
    ownerUserId: user.id,
    is_featured: Boolean(existing?.is_featured),
    __managedByAdmin: Boolean(existing?.__managedByAdmin),
  }
  const now = new Date().toISOString()
  clean.updatedAt = now

  if (existing) {
    assertCanEdit(user, existing)
    clean.id = existing.id
    clean.ownerUserId = getOwnerUserId(existing)
  }

  assertId(clean)
  if (!clean.author) clean.author = user.name || user.email
  return clean
}

// `parts` = segments du chemin après /__account/api/ (ex: ['collections','characters']).
export async function handleAccount(request, env, parts) {
  try {
    const user = await getRequestUser(env, request)
    if (!user) throw httpError(401, 'Connexion requise.')

    const method = request.method

    if (parts[0] === 'bootstrap' && method === 'GET') {
      const characters = await listCharacters(env)
      const data = { characters: ownRows(characters, user) }
      for (const name of REFERENCE_COLLECTIONS) data[name] = STATIC_COLLECTIONS[name] || []
      return json({ user, data })
    }

    if (parts[0] === 'collections') {
      const name = parts[1]
      assertOwnedCollection(name)

      if (method === 'GET' && parts.length === 2) {
        const rows = await listCharacters(env)
        return json({ data: ownRows(rows, user) })
      }

      if (method === 'POST' && parts.length === 2) {
        const clean = sanitizeOwnedRow(await readJson(request), user)
        if (CANON_CHARACTER_IDS.has(clean.id)) {
          throw httpError(409, 'Cet identifiant est réservé à un personnage canon — choisis-en un autre.')
        }
        const existing = await getCharacter(env, clean.id)
        if (existing) throw httpError(409, 'Cet identifiant existe déjà.')
        await insertRow(env, 'characters', clean)
        return json({ row: clean })
      }

      if ((method === 'PUT' || method === 'DELETE') && parts[2]) {
        const id = decodeURIComponent(parts[2])
        const existing = await getCharacter(env, id)
        if (!existing) throw httpError(404, 'Fiche introuvable.')
        assertCanEdit(user, existing)

        if (method === 'PUT') {
          const clean = sanitizeOwnedRow(await readJson(request), user, existing)
          await updateRow(env, 'characters', id, clean)
          return json({ row: clean })
        }

        await deleteRow(env, 'characters', id)
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
