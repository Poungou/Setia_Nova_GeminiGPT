// worker/routes/account.js
//
// Port Cloudflare Worker de plugins/woltar-account.js. Un compte ne peut
// créer/modifier/supprimer que ses propres personnages, clans, lieux et articles
// (ownerUserId) — sauf une administratrice, qui voit et modère tout (voir
// canEditOwnedResource/isAdmin dans lib/authStore.js). Les collections de
// référence restantes (chronologie et archives) restent en lecture seule,
// empaquetées au build — voir worker/lib/contentStore.js et
// docs/CLOUDFLARE_DEPLOYMENT_PLAN.md, section « Portée retenue ».
//
// Historique — tâche « Aether » : la collection `personas` (Personas RP
// liées à un personnage, gérables depuis /compte) a été retirée d'ici. Le
// site n'a plus qu'un seul assistant IA central, AETHER (config statique,
// non liée à un compte) — voir worker/routes/aether.js.
//
// Historique — multi-utilisateur (clans) : `clans` a rejoint `characters`
// comme collection possédée par compte. Chaque clan garde ses membres dans
// la table `clan_members` (sauf le clan canon Nakamura, qui garde son
// tableau `members` embarqué) — voir /collections/clans/:id/members
// ci-dessous et worker/lib/contentStore.js.
//
// Historique — sécurisation du compte : /security/change-password et
// /security/change-email vivent ici (et pas dans worker/routes/auth.js) car
// les deux exigent une session active, contrairement à forgot-password/
// reset-password/confirm-email — voir handleSecurity ci-dessous.

import {
  canEditOwnedResource,
  changePassword,
  createSessionToken,
  getOwnerUserId,
  getRequestUser,
  httpError,
  isAdmin,
  requestEmailChange,
  sessionCookieHeader,
} from '../lib/authStore.js'
import {
  STATIC_COLLECTIONS,
  addClanMember,
  deleteClan,
  deleteRow,
  deleteTimeline,
  getCharacter,
  getClan,
  getTimeline,
  insertClan,
  insertRow,
  insertTimeline,
  listCharacters,
  listClanMembers,
  listClans,
  listLocations,
  listTimelines,
  getLocation,
  insertLocation,
  updateLocation,
  deleteLocation,
  listPosts,
  getPost,
  insertPost,
  updatePost,
  deletePost,
  removeClanMember,
  updateClan,
  updateRow,
  updateTimeline,
} from '../lib/contentStore.js'
import { saveMedia } from '../lib/mediaStore.js'
import { canCreate, CREATE_PERMISSIONS } from '../lib/permissions.js'
import { getPlayerProfile, savePlayerProfile } from '../lib/playerProfiles.js'
import { normalizeTimelineEvents } from '../../src/lib/timelineEvents.js'
import staticCharactersJson from '../../src/data/characters.json' with { type: 'json' }
import staticClansJson from '../../src/data/clans.json' with { type: 'json' }
import staticLocationsJson from '../../src/data/locations.json' with { type: 'json' }
import staticTimelinesJson from '../../src/data/timelines.json' with { type: 'json' }

const REFERENCE_COLLECTIONS = Object.keys(STATIC_COLLECTIONS).filter((name) => name !== 'locations')
const OWNED_COLLECTIONS = new Set(['characters', 'clans', 'locations', 'posts', 'timelines'])

// Un compte ne peut jamais créer une fiche qui porte l'id d'une entrée
// canon (src/data/characters.json, src/data/clans.json) — même si D1 ne
// contient rien pour cet id. Voir worker/lib/contentStore.js : le canon
// reste prioritaire à la lecture de toute façon, mais autoriser la création
// éviterait juste une fiche D1 fantôme, jamais affichée nulle part — mieux
// vaut refuser clairement plutôt que laisser un identifiant piégé.
const CANON_CHARACTER_IDS = new Set(staticCharactersJson.map((c) => c.id))
const CANON_CLAN_IDS = new Set(staticClansJson.map((c) => c.id))
const CANON_LOCATION_IDS = new Set(staticLocationsJson.map((l) => l.id))
const CANON_POST_IDS = new Set((await import('../../src/data/posts.json', { with: { type: 'json' } })).default.map((post) => post.id))
const CANON_TIMELINE_IDS = new Set(staticTimelinesJson.map((timeline) => timeline.id))

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

// Un contenu "system" (canon, géré par /admin — ex. Kazuko via
// managed_by_admin, ou un futur clan Nakamura en D1) ne doit JAMAIS
// apparaître ni être modifiable ici, MÊME pour une administratrice : la
// désérialisation de ce endpoint (sanitizeOwnedClanRow notamment) supprime
// des champs propres au contenu de compte (ex. `members`) et écraserait un
// contenu canon. /compte reste réservé au contenu de compte ; le canon se
// modifie exclusivement via /admin.
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
    throw httpError(403, 'Cette collection est réservée à l’administration.')
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

function sanitizeOwnedClanRow(row, user, existing = null) {
  const clean = { ...row, ownerUserId: user.id }
  const now = new Date().toISOString()
  clean.updatedAt = now
  // Les membres passent uniquement par /collections/clans/:id/members —
  // jamais par une réécriture directe du tableau depuis ce endpoint.
  delete clean.members

  if (existing) {
    assertCanEdit(user, existing)
    clean.id = existing.id
    clean.ownerUserId = getOwnerUserId(existing)
  }

  assertId(clean)
  return clean
}

// Une chronologie de compte réutilise le sanitize générique (ownerUserId,
// updatedAt...) puis normalise ses propres champs : titre/description
// courts, spoiler booléen, personnages liés dédupliqués, et surtout le
// tableau `events` (voir src/lib/timelineEvents.js#normalizeTimelineEvents —
// même normalisation utilisée par le plugin de dev, pour un comportement
// identique). `author` (ajouté par sanitizeOwnedRow, pensé pour les
// articles) n'a pas de sens ici et est retiré.
function sanitizeOwnedTimelineRow(row, user, existing = null) {
  const clean = sanitizeOwnedRow(row, user, existing)
  delete clean.author
  clean.title = String(clean.title || '').trim().slice(0, 200)
  clean.description = String(clean.description || '').trim().slice(0, 4000)
  clean.spoiler = clean.spoiler === true
  clean.characters = Array.isArray(clean.characters)
    ? [...new Set(clean.characters.filter((id) => typeof id === 'string' && id.trim()))]
    : []
  clean.events = normalizeTimelineEvents(clean.events)
  return clean
}

const COLLECTION_OPS = {
  characters: {
    list: (env) => listCharacters(env),
    get: (env, id) => getCharacter(env, id),
    insert: (env, row) => insertRow(env, 'characters', row),
    update: (env, id, row) => updateRow(env, 'characters', id, row),
    remove: (env, id) => deleteRow(env, 'characters', id),
    sanitize: sanitizeOwnedRow,
    canonIds: CANON_CHARACTER_IDS,
    canonMessage: 'Cet identifiant est réservé à un personnage canon — choisis-en un autre.',
  },
  clans: {
    list: (env) => listClans(env),
    get: (env, id) => getClan(env, id),
    insert: (env, row) => insertClan(env, row),
    update: (env, id, row) => updateClan(env, id, row),
    remove: (env, id) => deleteClan(env, id),
    sanitize: sanitizeOwnedClanRow,
    canonIds: CANON_CLAN_IDS,
    canonMessage: 'Cet identifiant est réservé à un clan canon — choisis-en un autre.',
  },
  locations: {
    list: (env) => listLocations(env),
    get: (env, id) => getLocation(env, id),
    insert: (env, row) => insertLocation(env, row),
    update: (env, id, row) => updateLocation(env, id, row),
    remove: (env, id) => deleteLocation(env, id),
    sanitize: sanitizeOwnedRow,
    canonIds: CANON_LOCATION_IDS,
    canonMessage: 'Cet identifiant est réservé à un lieu canon — choisis-en un autre.',
  },
  posts: {
    list: (env) => listPosts(env),
    get: (env, id) => getPost(env, id),
    insert: (env, row) => insertPost(env, row),
    update: (env, id, row) => updatePost(env, id, row),
    remove: (env, id) => deletePost(env, id),
    sanitize: sanitizeOwnedRow,
    canonIds: CANON_POST_IDS,
    canonMessage: 'Cet identifiant est réservé à un article canon — choisis-en un autre.',
  },
  timelines: {
    list: (env) => listTimelines(env),
    get: (env, id) => getTimeline(env, id),
    insert: (env, row) => insertTimeline(env, row),
    update: (env, id, row) => updateTimeline(env, id, row),
    remove: (env, id) => deleteTimeline(env, id),
    sanitize: sanitizeOwnedTimelineRow,
    canonIds: CANON_TIMELINE_IDS,
    canonMessage: 'Cet identifiant est réservé à une chronologie canon — choisis-en un autre.',
  },
}

// Un personnage canon ne peut jamais rejoindre un clan de compte, et un
// compte ne peut ajouter que ses propres personnages à son propre clan —
// une administratrice peut ajouter n'importe quel personnage (modération).
async function assertCanAddMember(env, actor, characterId) {
  if (CANON_CHARACTER_IDS.has(characterId)) {
    throw httpError(403, 'Un personnage canon ne peut pas être ajouté à un clan de compte.')
  }
  const character = await getCharacter(env, characterId)
  if (!character) throw httpError(404, 'Personnage introuvable.')
  if (!isAdmin(actor) && getOwnerUserId(character) !== actor.id) {
    throw httpError(403, 'Tu ne peux ajouter que tes propres personnages à ton clan.')
  }
  return character
}

async function handleClanMembers(request, env, user, clanId, characterIdPart, method) {
  const clan = await getClan(env, clanId)
  if (!clan || isSystemOwned(clan)) throw httpError(404, 'Clan introuvable.')
  assertCanEdit(user, clan)

  if (method === 'GET' && !characterIdPart) {
    return json({ data: await listClanMembers(env, clanId) })
  }

  if (method === 'POST' && !characterIdPart) {
    const body = await readJson(request)
    const characterId = String(body?.characterId || '').trim()
    if (!characterId) throw httpError(400, 'Identifiant de personnage manquant.')
    await assertCanAddMember(env, user, characterId)
    await addClanMember(env, clanId, characterId, { role: String(body?.role || ''), order: Number(body?.order) || 0 })
    return json({ ok: true, data: await listClanMembers(env, clanId) })
  }

  if (method === 'DELETE' && characterIdPart) {
    await removeClanMember(env, clanId, decodeURIComponent(characterIdPart))
    return json({ ok: true, data: await listClanMembers(env, clanId) })
  }

  return json({ error: 'Route inconnue' }, { status: 404 })
}

// Changement de mot de passe / demande de changement d'email depuis l'espace
// connecté (§ "Sécurité du compte"). Les deux exigent le mot de passe actuel
// et sont revérifiés côté serveur dans worker/lib/authStore.js — jamais
// seulement côté React. Un changement de mot de passe réussi ré-émet un
// cookie de session à jour (session_version incrémenté) pour que l'onglet
// qui vient de faire le changement reste connecté ; toute AUTRE session
// ouverte ailleurs, dont le jeton porte l'ancienne version, est invalidée
// dès sa prochaine requête (voir getRequestUser).
async function handleSecurity(request, env, user, action, method) {
  if (method !== 'POST') return json({ error: 'Route inconnue' }, { status: 404 })
  const body = await readJson(request)

  if (action === 'change-password') {
    const updated = await changePassword(env, user, {
      currentPassword: body?.currentPassword,
      newPassword: body?.newPassword,
    })
    const token = createSessionToken(env, updated)
    return json({ ok: true, user: updated }, { headers: { 'Set-Cookie': sessionCookieHeader(token) } })
  }

  if (action === 'change-email') {
    const origin = new URL(request.url).origin
    const updated = await requestEmailChange(env, user, {
      newEmail: body?.newEmail,
      currentPassword: body?.currentPassword,
      origin,
    })
    return json({
      ok: true,
      user: updated,
      message: 'Un email de confirmation vient d’être envoyé à la nouvelle adresse.',
    })
  }

  return json({ error: 'Route inconnue' }, { status: 404 })
}

// `parts` = segments du chemin après /__account/api/ (ex: ['collections','characters']).
export async function handleAccount(request, env, parts) {
  try {
    const user = await getRequestUser(env, request)
    if (!user) throw httpError(401, 'Connexion requise.')

    const method = request.method

    if (parts[0] === 'security') {
      return await handleSecurity(request, env, user, parts[1], method)
    }

    if (parts[0] === 'profile' && parts.length === 1) {
      assertCanManagePlayerProfile(user)
      if (method === 'GET') return json({ profile: await getPlayerProfile(env, user.id) })
      if (method === 'PUT') return json({ profile: await savePlayerProfile(env, user.id, await readJson(request), { allowSystemCharacters: isAdmin(user) }) })
    }

    // Upload de l'avatar joueur — même mécanisme de stockage que /__admin
    // (voir worker/lib/mediaStore.js), mais ouvert à toute joueuse pouvant
    // gérer un profil (pas besoin d'être admin) : seule sa propre session
    // compte, il n'y a pas d'id de compte ciblé dans l'URL. `kind` est
    // volontairement forcé à 'image' ici, quoi qu'envoie le client — un
    // avatar n'est jamais un fichier audio.
    if (parts[0] === 'upload' && parts.length === 1) {
      assertCanManagePlayerProfile(user)
      if (method !== 'POST') return json({ error: 'Methode non autorisee' }, { status: 405 })
      const body = await readJson(request)
      const result = await saveMedia(env, { filename: body?.filename, dataUrl: body?.dataUrl, kind: 'image' })
      return json(result)
    }

    if (parts[0] === 'bootstrap' && method === 'GET') {
      const characters = await listCharacters(env)
      const clans = await listClans(env)
      const data = {
        characters: isAdmin(user) ? characters : visibleRows(characters, user),
        clans: visibleRows(clans, user),
        locations: visibleRows(await listLocations(env), user),
        posts: visibleRows(await listPosts(env), user),
        timelines: visibleRows(await listTimelines(env), user),
      }
      for (const name of REFERENCE_COLLECTIONS) data[name] = STATIC_COLLECTIONS[name] || []
      return json({ user, data })
    }

    if (parts[0] === 'collections') {
      const name = parts[1]
      assertOwnedCollection(name)

      // Sous-route membres de clan : /collections/clans/:id/members[/:characterId]
      // Gardée AVANT la route générique PUT/DELETE ci-dessous, avec un
      // retour explicite, pour qu'une requête malformée sur /members ne
      // puisse jamais retomber sur la suppression du clan entier.
      if (name === 'clans' && parts[2] && parts[3] === 'members') {
        return await handleClanMembers(request, env, user, decodeURIComponent(parts[2]), parts[4], method)
      }

      const ops = COLLECTION_OPS[name]

      if (method === 'GET' && parts.length === 2) {
        const rows = await ops.list(env)
        return json({ data: visibleRows(rows, user) })
      }

      if (method === 'POST' && parts.length === 2) {
        const permission = CREATE_PERMISSIONS[name]
        if (!permission || !canCreate(user, permission)) {
          throw httpError(403, 'Cette possibilité n’est pas activée pour ton compte.')
        }
        const clean = ops.sanitize(await readJson(request), user)
        if (ops.canonIds.has(clean.id)) {
          throw httpError(409, ops.canonMessage)
        }
        const existing = await ops.get(env, clean.id)
        if (existing) throw httpError(409, 'Cet identifiant existe déjà.')
        await ops.insert(env, clean)
        return json({ row: clean })
      }

      if ((method === 'PUT' || method === 'DELETE') && parts[2] && !parts[3]) {
        const id = decodeURIComponent(parts[2])
        const existing = await ops.get(env, id)
        if (!existing || isSystemOwned(existing)) throw httpError(404, 'Fiche introuvable.')
        assertCanEdit(user, existing)

        if (method === 'PUT') {
          const clean = ops.sanitize(await readJson(request), user, existing)
          await ops.update(env, id, clean)
          return json({ row: clean })
        }

        await ops.remove(env, id)
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
