// plugins/woltar-account.js
//
// API serveur pour l'espace utilisateur /compte. Elle est volontairement
// limitee aux personnages et Personas IA appartenant a l'utilisateur connecte.

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  canEditOwnedResource,
  getOwnerUserId,
  getRequestUser,
  httpError,
} from './lib/authStore.js'

const MAX_BODY_BYTES = 1024 * 1024
const OWNED_COLLECTIONS = new Set(['characters', 'personas'])
const REFERENCE_COLLECTIONS = ['locations', 'clans', 'events', 'archives', 'posts']

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > MAX_BODY_BYTES) reject(new Error('Corps trop volumineux'))
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const raw = await readBody(req)
  return raw ? JSON.parse(raw) : {}
}

async function readCollection(dataDir, name) {
  return JSON.parse(await readFile(path.join(dataDir, `${name}.json`), 'utf8'))
}

async function writeCollection(dataDir, name, rows) {
  await writeFile(path.join(dataDir, `${name}.json`), JSON.stringify(rows, null, 2) + '\n', 'utf8')
}

function ownRows(rows, user) {
  return rows.filter((row) => getOwnerUserId(row) === user.id)
}

function assertOwnedCollection(name) {
  if (!OWNED_COLLECTIONS.has(name)) {
    throw httpError(403, 'Cette collection est reservee a l’administration.')
  }
}

function assertCanEdit(user, row) {
  if (!canEditOwnedResource(user, row)) throw httpError(403, 'Tu ne peux modifier que tes propres contenus.')
}

function assertId(row) {
  if (!row?.id || typeof row.id !== 'string') throw httpError(400, 'Identifiant manquant.')
}

async function sanitizeOwnedRow(dataDir, name, row, user, existing = null) {
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
    if (!characterId) throw httpError(400, 'Choisis un personnage associe.')
    if (existing && characterId !== existing.characterId) {
      throw httpError(400, 'Pour changer de personnage associe, cree une nouvelle Persona.')
    }

    const characters = await readCollection(dataDir, 'characters')
    const character = characters.find((c) => c.id === characterId)
    if (!character) throw httpError(404, 'Fiche personnage associee introuvable.')
    if (getOwnerUserId(character) !== user.id) {
      throw httpError(403, 'Tu peux creer une Persona uniquement pour tes propres personnages.')
    }

    clean.characterId = characterId
    clean.id = existing?.id || characterId
    return clean
  }

  throw httpError(403, 'Collection non autorisee.')
}

export default function woltarAccount() {
  return {
    name: 'woltar-account',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const dataDir = path.join(root, 'src', 'data')

      server.middlewares.use('/__account/api', async (req, res) => {
        const send = (code, obj) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(obj))
        }

        try {
          const user = await getRequestUser(root, req)
          if (!user) throw httpError(401, 'Connexion requise.')

          const url = new URL(req.url, 'http://localhost')
          const parts = url.pathname.split('/').filter(Boolean)

          if (parts[0] === 'bootstrap' && req.method === 'GET') {
            const characters = await readCollection(dataDir, 'characters')
            const personas = await readCollection(dataDir, 'personas')
            const data = {
              characters: ownRows(characters, user),
              personas: ownRows(personas, user),
            }
            for (const name of REFERENCE_COLLECTIONS) data[name] = await readCollection(dataDir, name)
            return send(200, { user, data })
          }

          if (parts[0] === 'collections') {
            const name = parts[1]
            assertOwnedCollection(name)
            const rows = await readCollection(dataDir, name)

            if (req.method === 'GET' && parts.length === 2) {
              return send(200, { data: ownRows(rows, user) })
            }

            if (req.method === 'POST' && parts.length === 2) {
              const clean = await sanitizeOwnedRow(dataDir, name, await readJson(req), user)
              if (rows.some((row) => row.id === clean.id)) {
                throw httpError(409, 'Cet identifiant existe deja.')
              }
              await writeCollection(dataDir, name, [...rows, clean])
              return send(200, { row: clean })
            }

            if ((req.method === 'PUT' || req.method === 'DELETE') && parts[2]) {
              const id = decodeURIComponent(parts[2])
              const existing = rows.find((row) => row.id === id)
              if (!existing) throw httpError(404, 'Fiche introuvable.')
              assertCanEdit(user, existing)

              if (req.method === 'PUT') {
                const clean = await sanitizeOwnedRow(dataDir, name, await readJson(req), user, existing)
                await writeCollection(
                  dataDir,
                  name,
                  rows.map((row) => (row.id === id ? clean : row)),
                )
                return send(200, { row: clean })
              }

              await writeCollection(
                dataDir,
                name,
                rows.filter((row) => row.id !== id),
              )

              if (name === 'characters') {
                const personas = await readCollection(dataDir, 'personas')
                const nextPersonas = personas.filter(
                  (persona) => !(persona.characterId === id && getOwnerUserId(persona) === user.id),
                )
                if (nextPersonas.length !== personas.length) {
                  await writeCollection(dataDir, 'personas', nextPersonas)
                }
              }

              return send(200, { ok: true })
            }
          }

          return send(404, { error: 'Route inconnue' })
        } catch (err) {
          const status = err?.status || 500
          if (status >= 500) console.error('[woltar-account]', err)
          return send(status, { error: err?.message || 'Erreur compte.' })
        }
      })
    },
  }
}
