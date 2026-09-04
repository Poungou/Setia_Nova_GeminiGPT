// plugins/woltar-account.js
//
// API serveur pour l'espace utilisateur /compte. Un compte joueur ne peut
// créer/modifier/supprimer que ses propres personnages et clans — sauf une
// administratrice, qui voit et modère tout (voir canEditOwnedResource/
// isAdmin dans lib/authStore.js).
//
// Historique — tâche « Aether » : la collection `personas` (Personas RP
// liées à un personnage, gérables depuis /compte) a été retirée d'ici. Le
// site n'a plus qu'un seul assistant IA central, AETHER (config statique,
// non liée à un compte) — voir plugins/woltar-aether.js.
//
// Historique — multi-utilisateur (clans) : `clans` a rejoint `characters`
// comme collection possédée par compte. En dev, canon et clans de compte
// partagent le même fichier src/data/clans.json (distingués par
// ownerUserId) : pas de split D1/statique côté fichiers ici, contrairement
// à la prod. Les membres d'un clan de compte vivent séparément dans
// plugins/data/clan-members.json — voir plugins/lib/clanMembers.js — pour
// ne jamais réécrire tout le tableau `members` d'un clan canon depuis ce
// endpoint.
//
// Historique — sécurisation du compte : /security/change-password et
// /security/change-email vivent ici (session active exigée), en miroir de
// worker/routes/account.js — voir handleSecurity ci-dessous.

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  canEditOwnedResource,
  changePassword,
  createSessionToken,
  getOwnerUserId,
  getRequestUser,
  httpError,
  isAdmin,
  requestEmailChange,
  setSessionCookie,
} from './lib/authStore.js'
import { addClanMember, listClanMembers, removeClan, removeClanMember } from './lib/clanMembers.js'
import { canCreate, CREATE_PERMISSIONS } from '../worker/lib/permissions.js'
import { getPlayerProfile, savePlayerProfile } from './lib/playerProfiles.js'

const MAX_BODY_BYTES = 1024 * 1024
const REFERENCE_COLLECTIONS = ['events', 'archives', 'posts']
const OWNED_COLLECTIONS = new Set(['characters', 'clans', 'locations'])

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

// Un contenu "system" (canon, géré par /admin — ex. le clan Nakamura, qui
// partage src/data/clans.json avec les clans de compte en dev) ne doit
// JAMAIS apparaître ni être modifiable ici, MÊME pour une administratrice :
// sanitizeOwnedClanRow supprime des champs propres au contenu de compte
// (ex. `members`) et écraserait un contenu canon. /compte reste réservé au
// contenu de compte ; le canon se modifie exclusivement via /admin.
function isSystemOwned(row) {
  return !row.ownerUserId || row.ownerUserId === 'system'
}

// Une administratrice voit tout le contenu DE COMPTE (modération, tous
// utilisateurs confondus) ; un compte joueur ne voit que ses propres fiches.
// Le contenu canon/system reste toujours exclu — voir isSystemOwned.
function visibleRows(rows, user) {
  const owned = rows.filter((row) => !isSystemOwned(row))
  if (isAdmin(user)) return owned
  return owned.filter((row) => getOwnerUserId(row) === user.id)
}

function assertOwnedCollection(name) {
  if (!OWNED_COLLECTIONS.has(name)) {
    throw httpError(403, 'Cette collection est reservee a l’administration.')
  }
}

function assertCanEdit(user, row) {
  if (!canEditOwnedResource(user, row)) {
    throw httpError(403, 'Tu ne peux modifier que tes propres contenus.')
  }
}

function assertCanManagePlayerProfile(user) {
  if (!isAdmin(user) && user.status !== 'RPiste') {
    throw httpError(403, 'Un statut RPiste est requis pour créer ou modifier un profil joueur.')
  }
}

function assertId(row) {
  if (!row?.id || typeof row.id !== 'string') throw httpError(400, 'Identifiant manquant.')
}

function sanitizeOwnedRow(row, user, existing = null) {
  const clean = { ...row, ownerUserId: user.id, is_featured: Boolean(existing?.is_featured) }
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

function sanitizeOwnedClanRow(row, user, existing = null) {
  const clean = { ...row, ownerUserId: user.id }
  const now = new Date().toISOString()
  clean.updatedAt = now
  // Les membres passent uniquement par /collections/clans/:id/members.
  delete clean.members

  if (existing) {
    assertCanEdit(user, existing)
    clean.id = existing.id
    clean.ownerUserId = getOwnerUserId(existing)
  }

  assertId(clean)
  return clean
}

function sanitizeRow(name, row, user, existing = null) {
  return name === 'clans' ? sanitizeOwnedClanRow(row, user, existing) : sanitizeOwnedRow(row, user, existing)
}

// Un personnage canon ne peut jamais rejoindre un clan de compte, et un
// compte ne peut ajouter que ses propres personnages à son propre clan —
// une administratrice peut ajouter n'importe quel personnage (modération).
async function assertCanAddMember(dataDir, actor, characterId) {
  const characters = await readCollection(dataDir, 'characters')
  const character = characters.find((c) => c.id === characterId)
  if (!character) throw httpError(404, 'Personnage introuvable.')
  if (!character.ownerUserId || character.ownerUserId === 'system') {
    throw httpError(403, 'Un personnage canon ne peut pas être ajouté à un clan de compte.')
  }
  if (!isAdmin(actor) && getOwnerUserId(character) !== actor.id) {
    throw httpError(403, 'Tu ne peux ajouter que tes propres personnages à ton clan.')
  }
  return character
}

async function handleClanMembers(req, dataDir, root, user, clanId, characterIdPart, method) {
  const clans = await readCollection(dataDir, 'clans')
  const clan = clans.find((c) => c.id === clanId)
  if (!clan || isSystemOwned(clan)) throw httpError(404, 'Clan introuvable.')
  assertCanEdit(user, clan)

  if (method === 'GET' && !characterIdPart) {
    return { code: 200, body: { data: await listClanMembers(root, clanId) } }
  }

  if (method === 'POST' && !characterIdPart) {
    const body = await readJson(req)
    const characterId = String(body?.characterId || '').trim()
    if (!characterId) throw httpError(400, 'Identifiant de personnage manquant.')
    await assertCanAddMember(dataDir, user, characterId)
    const data = await addClanMember(root, clanId, characterId, {
      role: String(body?.role || ''),
      order: Number(body?.order) || 0,
    })
    return { code: 200, body: { ok: true, data } }
  }

  if (method === 'DELETE' && characterIdPart) {
    await removeClanMember(root, clanId, decodeURIComponent(characterIdPart))
    return { code: 200, body: { ok: true, data: await listClanMembers(root, clanId) } }
  }

  throw httpError(404, 'Route inconnue')
}

// Changement de mot de passe / demande de changement d'email depuis l'espace
// connecté — miroir de worker/routes/account.js#handleSecurity. Le mot de
// passe actuel est revérifié côté serveur (plugins/lib/authStore.js) dans
// les deux cas. Un changement de mot de passe réussi ré-émet un cookie de
// session à jour pour ne pas déconnecter l'onglet qui vient de le faire.
async function handleSecurity(req, res, root, user, action, method) {
  if (method !== 'POST') return { code: 404, body: { error: 'Route inconnue' } }
  const body = await readJson(req)

  if (action === 'change-password') {
    const updated = await changePassword(root, user, {
      currentPassword: body?.currentPassword,
      newPassword: body?.newPassword,
    })
    setSessionCookie(res, await createSessionToken(root, updated))
    return { code: 200, body: { ok: true, user: updated } }
  }

  if (action === 'change-email') {
    const url = new URL(req.url, 'http://localhost')
    const updated = await requestEmailChange(root, user, {
      newEmail: body?.newEmail,
      currentPassword: body?.currentPassword,
      origin: url.origin,
    })
    return {
      code: 200,
      body: { ok: true, user: updated, message: 'Un email de confirmation vient d’être envoyé à la nouvelle adresse.' },
    }
  }

  return { code: 404, body: { error: 'Route inconnue' } }
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

          if (parts[0] === 'security') {
            const result = await handleSecurity(req, res, root, user, parts[1], req.method)
            return send(result.code, result.body)
          }

          if (parts[0] === 'profile' && parts.length === 1) {
            assertCanManagePlayerProfile(user)
            if (req.method === 'GET') return send(200, { profile: await getPlayerProfile(root, user.id) })
            if (req.method === 'PUT') return send(200, { profile: await savePlayerProfile(root, user.id, await readJson(req)) })
          }

          if (parts[0] === 'bootstrap' && req.method === 'GET') {
            const characters = await readCollection(dataDir, 'characters')
            const clans = await readCollection(dataDir, 'clans')
            const locations = await readCollection(dataDir, 'locations')
            const data = {
              characters: visibleRows(characters, user),
              clans: visibleRows(clans, user),
              locations: visibleRows(locations, user),
            }
            for (const name of REFERENCE_COLLECTIONS) data[name] = await readCollection(dataDir, name)
            return send(200, { user, data })
          }

          if (parts[0] === 'collections') {
            const name = parts[1]
            assertOwnedCollection(name)

            // Sous-route membres de clan : /collections/clans/:id/members[/:characterId]
            // Gardée AVANT la route générique PUT/DELETE, avec un retour
            // explicite, pour qu'une requête malformée sur /members ne
            // puisse jamais retomber sur la suppression du clan entier.
            if (name === 'clans' && parts[2] && parts[3] === 'members') {
              const result = await handleClanMembers(req, dataDir, root, user, decodeURIComponent(parts[2]), parts[4], req.method)
              return send(result.code, result.body)
            }

            const rows = await readCollection(dataDir, name)

            if (req.method === 'GET' && parts.length === 2) {
              return send(200, { data: visibleRows(rows, user) })
            }

            if (req.method === 'POST' && parts.length === 2) {
              const permission = CREATE_PERMISSIONS[name]
              if (!permission || !canCreate(user, permission)) {
                throw httpError(403, 'Cette possibilité n’est pas activée pour ton compte.')
              }
              const clean = sanitizeRow(name, await readJson(req), user)
              if (rows.some((row) => row.id === clean.id)) {
                throw httpError(409, 'Cet identifiant existe deja.')
              }
              await writeCollection(dataDir, name, [...rows, clean])
              return send(200, { row: clean })
            }

            if ((req.method === 'PUT' || req.method === 'DELETE') && parts[2] && !parts[3]) {
              const id = decodeURIComponent(parts[2])
              const existing = rows.find((row) => row.id === id)
              if (!existing || isSystemOwned(existing)) throw httpError(404, 'Fiche introuvable.')
              assertCanEdit(user, existing)

              if (req.method === 'PUT') {
                const clean = sanitizeRow(name, await readJson(req), user, existing)
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
              if (name === 'clans') await removeClan(root, id)

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
