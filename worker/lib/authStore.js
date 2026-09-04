// worker/lib/authStore.js
//
// Équivalent D1 de plugins/lib/authStore.js, pour le Worker Cloudflare. Même
// hachage de mot de passe (scrypt) et même schéma de session (cookie signé
// HMAC), mais les comptes vivent dans la table D1 `users` — un Worker n'a
// pas de système de fichiers, donc pas de plugins/data/users.json ici.
//
// Différences volontaires avec la version locale (voir
// docs/CLOUDFLARE_DEPLOYMENT_PLAN.md, section « Sécurité ») :
//   - PAS de route « admin local » (mot de passe en clair `woltar`) : ça n'a
//     de sens que sur le serveur de dev local, jamais dans le Worker déployé
//     publiquement — volontairement absente de ce fichier et de
//     worker/routes/auth.js ;
//   - le secret de session (AUTH_SESSION_SECRET) doit être un secret
//     Wrangler déjà en place — pas de génération automatique à la volée
//     comme côté local (impossible sans fichier persistant) ;
//   - /register ne crée jamais d'admin sur le Worker public. Quand
//     `env.ALLOW_PUBLIC_REGISTRATION` vaut "true", les nouveaux comptes sont
//     toujours `user`. Les droits admin doivent déjà exister ou être attribués
//     par un admin connecté ;
//   - le cookie de session porte l'attribut `Secure` (le Worker est
//     toujours servi en HTTPS, contrairement à http://localhost en dev).
//
// Historique — sécurisation du compte (mot de passe oublié, changement de
// mot de passe, changement d'email) :
//   - `session_version` (colonne D1, migration 0005) est incrémenté à
//     chaque changement de mot de passe ou d'email confirmé. Le jeton de
//     session porte la valeur en vigueur au moment de la connexion (`ver`) ;
//     getRequestUser refuse tout jeton dont `ver` ne correspond plus à la
//     colonne — ça invalide toutes les AUTRES sessions actives sans avoir
//     besoin d'une table de sessions serveur à part (voir
//     changePassword/resetPassword/confirmEmailChange ci-dessous) ;
//   - `account_tokens` (même migration) porte les jetons à usage unique pour
//     "mot de passe oublié" et "confirmation de nouvelle adresse email". Le
//     jeton BRUT n'est jamais stocké : seul son hash SHA-256 l'est
//     (token_hash), comparé au hash du jeton reçu par lien. Portée courte
//     (30 min reset / 60 min email) et usage unique (used_at) ;
//   - `requestPasswordReset` ne révèle jamais si une adresse existe : le
//     travail (génération de jeton + envoi) n'est fait que si un compte
//     correspond, mais worker/routes/auth.js répond la même chose dans tous
//     les cas.

import { createHash, createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { emailChangeEmail, passwordResetEmail, sendMail } from './mailer.js'
import { normalizePermissions } from './permissions.js'

const scrypt = promisify(scryptCallback)

export const SESSION_COOKIE = 'woltar_session'
export const SYSTEM_OWNER_ID = 'system'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000
export const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000

export function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function optionalEmail(email) {
  const value = normalizeEmail(email)
  return value || null
}

function assertPassword(password) {
  if (String(password || '').length < 8) {
    throw httpError(400, 'Le mot de passe doit contenir au moins 8 caractères.')
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url')
  const hash = await scrypt(String(password), salt, 64)
  return `scrypt:${salt}:${hash.toString('base64url')}`
}

async function verifyPassword(password, stored) {
  const [scheme, salt, encoded] = String(stored || '').split(':')
  if (scheme !== 'scrypt' || !salt || !encoded) return false
  const expected = Buffer.from(encoded, 'base64url')
  const actual = await scrypt(String(password), salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex')
}

function generateRawToken() {
  return randomBytes(32).toString('base64url')
}

function normalizeAdminStatus(status) {
  const value = String(status || 'Membre').trim()
  if (!['Membre', 'RPiste', 'Invité'].includes(value)) throw httpError(400, 'Statut utilisateur invalide.')
  return value
}

function normalizeAdminRole(role) {
  if (role !== 'admin' && role !== 'user') throw httpError(400, 'Rôle utilisateur invalide.')
  return role
}

function rowToUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status || 'Membre',
    permissions: normalizePermissions(row.permissions),
    disabled: Boolean(row.disabled),
    passwordHash: row.password_hash,
    sessionVersion: row.session_version || 0,
    pendingEmail: row.pending_email || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function hydrateUser(db, row) {
  const user = rowToUser(row)
  if (!user) return null
  const { results } = await db
    .prepare('SELECT permission, granted FROM user_permissions WHERE user_id = ?')
    .bind(user.id)
    .all()
  user.permissions = Object.fromEntries((results || []).map((item) => [item.permission, Boolean(item.granted)]))
  return user
}

// Ne renvoie jamais passwordHash au front — même à une administratrice (voir
// worker/routes/auth.js#users : la liste admin passe aussi par publicUser).
export function publicUser(user) {
  if (!user) return null
  const safe = { ...user }
  delete safe.passwordHash
  return safe
}

export function isAdmin(user) {
  return user?.role === 'admin' && !user.disabled
}

export function getOwnerUserId(row) {
  return row?.ownerUserId || SYSTEM_OWNER_ID
}

export function canEditOwnedResource(user, row) {
  if (isAdmin(user)) return true
  return Boolean(user?.id && getOwnerUserId(row) === user.id)
}

async function findUserByEmail(db, email) {
  if (!email) return null
  const row = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  return hydrateUser(db, row)
}

async function findUserByIdentifier(db, identifier) {
  const value = String(identifier || '').trim()
  if (!value) return null
  const byEmail = await findUserByEmail(db, normalizeEmail(value))
  if (byEmail) return byEmail
  const row = await db.prepare('SELECT * FROM users WHERE lower(name) = lower(?)').bind(value).first()
  return hydrateUser(db, row)
}

async function findUserById(db, id) {
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
  return hydrateUser(db, row)
}

export async function registerUser(env, payload) {
  const db = env.WOLTAR_DB
  const email = optionalEmail(payload?.email)
  const name = String(payload?.name || '').trim()
  const password = String(payload?.password || '')

  if (!name) throw httpError(400, 'Le pseudo est obligatoire.')
  if (email && !email.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
  assertPassword(password)

  if (await findUserByEmail(db, email)) {
    throw httpError(409, 'Un compte existe déjà avec cette adresse.')
  }

  if (env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
    throw httpError(403, 'Les inscriptions publiques sont fermées pour le moment.')
  }

  const now = new Date().toISOString()
  const user = {
    id: `user_${randomUUID()}`,
    email,
    name,
    role: 'user',
    status: 'Membre',
    permissions: {},
    disabled: false,
    passwordHash: await hashPassword(password),
    sessionVersion: 0,
    createdAt: now,
    updatedAt: now,
  }

  await db
    .prepare(
      'INSERT INTO users (id, email, name, role, status, disabled, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)',
    )
    .bind(user.id, user.email, user.name, user.role, user.status, user.passwordHash, user.createdAt, user.updatedAt)
    .run()

  return publicUser(user)
}

export async function loginUser(env, payload) {
  const identifier = payload?.identifier ?? payload?.email
  const password = String(payload?.password || '')
  const user = await findUserByIdentifier(env.WOLTAR_DB, identifier)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw httpError(401, 'Identifiants invalides.')
  }
  if (user.disabled) throw httpError(403, 'Ce compte est désactivé.')
  return publicUser(user)
}

export async function listPublicUsers(env) {
  const { results } = await env.WOLTAR_DB
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM characters WHERE owner_user_id = users.id) AS character_count,
        (SELECT COUNT(*) FROM clans WHERE owner_user_id = users.id) AS clan_count,
        (SELECT COUNT(*) FROM locations WHERE owner_user_id = users.id) AS location_count
       FROM users ORDER BY created_at ASC`,
    )
    .all()
  return Promise.all((results || []).map(async (row) => {
    const user = await hydrateUser(env.WOLTAR_DB, row)
    return publicUser({
      ...user,
      contentCounts: {
        characters: Number(row.character_count || 0),
        clans: Number(row.clan_count || 0),
        locations: Number(row.location_count || 0),
      },
    })
  }))
}

export async function createUser(env, payload, actor) {
  if (!isAdmin(actor)) throw httpError(403, 'Réservé admin.')
  const db = env.WOLTAR_DB
  const email = optionalEmail(payload?.email)
  const name = String(payload?.name || '').trim()
  const password = String(payload?.password || '')
  const confirmation = String(payload?.passwordConfirmation || '')
  if (!name) throw httpError(400, 'Le pseudo est obligatoire.')
  if (email && !email.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
  assertPassword(password)
  if (password !== confirmation) throw httpError(400, 'La confirmation du mot de passe ne correspond pas.')
  if (await findUserByEmail(db, email)) throw httpError(409, 'Cette adresse e-mail est déjà utilisée.')

  const permissions = normalizePermissions(payload?.permissions)
  const now = new Date().toISOString()
  const user = {
    id: `user_${randomUUID()}`,
    email,
    name,
    role: normalizeAdminRole(payload?.role || 'user'),
    status: normalizeAdminStatus(payload?.status),
    permissions,
    disabled: payload?.active === false,
    passwordHash: await hashPassword(password),
    sessionVersion: 0,
    createdAt: now,
    updatedAt: now,
  }
  const statements = [
    db.prepare(
      'INSERT INTO users (id, email, name, role, status, disabled, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(user.id, user.email, user.name, user.role, user.status, user.disabled ? 1 : 0, user.passwordHash, now, now),
    ...Object.entries(permissions).map(([permission, granted]) => db.prepare(
      'INSERT INTO user_permissions (user_id, permission, granted, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(user.id, permission, granted ? 1 : 0, actor.id, now)),
  ]
  if (typeof db.batch !== 'function') throw httpError(500, 'Le stockage transactionnel n’est pas disponible.')
  await db.batch(statements)
  return publicUser(user)
}

export async function updateUser(env, id, patch, actor) {
  if (!isAdmin(actor)) throw httpError(403, 'Réservé admin.')
  const db = env.WOLTAR_DB
  const existing = await findUserById(db, id)
  if (!existing) throw httpError(404, 'Utilisateur introuvable.')

  const next = { ...existing }
  if (typeof patch?.name === 'string') next.name = patch.name.trim() || next.name
  if (Object.prototype.hasOwnProperty.call(patch || {}, 'email')) {
    const email = optionalEmail(patch.email)
    if (email && !email.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
    const conflict = email ? await findUserByEmail(db, email) : null
    if (conflict && conflict.id !== id) throw httpError(409, 'Cette adresse est déjà utilisée par un autre compte.')
    next.email = email
    if (email !== existing.email) next.sessionVersion = (existing.sessionVersion || 0) + 1
  }
  if (typeof patch?.status === 'string' && patch.status.trim()) next.status = patch.status.trim().slice(0, 80)
  if (patch?.role === 'admin' || patch?.role === 'user') next.role = patch.role
  if (typeof patch?.disabled === 'boolean') {
    if (actor.id === id && patch.disabled) {
      throw httpError(400, 'Impossible de désactiver le compte admin connecté.')
    }
    next.disabled = patch.disabled
  }
  // Reset de mot de passe assisté par un admin (§ "mot de passe oublié") —
  // reste disponible en complément du flux self-service par email
  // ci-dessous, ex. compte bloqué sans accès à l'email d'origine. Comme le
  // changement self-service, ça invalide les autres sessions actives.
  if (typeof patch?.password === 'string' && patch.password) {
    assertPassword(patch.password)
    next.passwordHash = await hashPassword(patch.password)
    next.sessionVersion = (existing.sessionVersion || 0) + 1
  }
  next.updatedAt = new Date().toISOString()

  await db
    .prepare(
      'UPDATE users SET email = ?, name = ?, role = ?, status = ?, disabled = ?, password_hash = ?, session_version = ?, updated_at = ? WHERE id = ?',
    )
    .bind(next.email, next.name, next.role, next.status, next.disabled ? 1 : 0, next.passwordHash, next.sessionVersion, next.updatedAt, id)
    .run()

  if (patch?.permissions && typeof patch.permissions === 'object' && !Array.isArray(patch.permissions)) {
    const permissions = normalizePermissions(patch.permissions)
    for (const [permission, granted] of Object.entries(permissions)) {
      await db
        .prepare(
          'INSERT INTO user_permissions (user_id, permission, granted, updated_by, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, permission) DO UPDATE SET granted = excluded.granted, updated_by = excluded.updated_by, updated_at = excluded.updated_at',
        )
        .bind(id, permission, granted ? 1 : 0, actor.id, next.updatedAt)
        .run()
    }
    next.permissions = { ...existing.permissions, ...permissions }
  }

  return publicUser(next)
}

function sign(secret, payload) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function requireSessionSecret(env) {
  const secret = env.AUTH_SESSION_SECRET
  if (!secret) {
    throw httpError(500, "AUTH_SESSION_SECRET n'est pas configuré côté serveur (secret Wrangler manquant).")
  }
  return secret
}

export function createSessionToken(env, user) {
  const secret = requireSessionSecret(env)
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      ver: user.sessionVersion || 0,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    }),
  ).toString('base64url')
  return `${payload}.${sign(secret, payload)}`
}

function verifySessionToken(env, token) {
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature) return null
  const secret = requireSessionSecret(env)
  const expected = sign(secret, payload)
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return null
  }
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null
  return data
}

export function getCookie(request, name) {
  const header = request.headers.get('cookie') || ''
  const parts = header.split(';').map((part) => part.trim())
  const found = parts.find((part) => part.startsWith(`${name}=`))
  return found ? decodeURIComponent(found.slice(name.length + 1)) : ''
}

export function sessionCookieHeader(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

export async function getRequestUser(env, request) {
  const token = getCookie(request, SESSION_COOKIE)
  if (!token) return null

  let payload = null
  try {
    payload = verifySessionToken(env, token)
  } catch {
    return null
  }
  if (!payload?.sub) return null

  const user = await findUserById(env.WOLTAR_DB, payload.sub)
  if (!user || user.disabled) return null
  // Un changement de mot de passe / d'email incrémente session_version :
  // tout jeton signé avant ce changement devient invalide immédiatement,
  // même s'il n'a pas expiré. `ver` absent (jetons émis avant cette
  // fonctionnalité) vaut 0, comme la valeur par défaut de la colonne :
  // aucune session existante n'est cassée par la migration 0005.
  if ((payload.ver || 0) !== (user.sessionVersion || 0)) return null
  return publicUser(user)
}

// --- Sécurisation du compte -------------------------------------------------

export async function changePassword(env, actor, { currentPassword, newPassword }) {
  const db = env.WOLTAR_DB
  // Toujours revérifié depuis une lecture fraîche de la base — jamais
  // depuis l'objet `actor` déjà en mémoire (potentiellement périmé).
  const fresh = await findUserById(db, actor.id)
  if (!fresh) throw httpError(404, 'Compte introuvable.')
  if (!(await verifyPassword(String(currentPassword || ''), fresh.passwordHash))) {
    throw httpError(401, 'Mot de passe actuel incorrect.')
  }
  assertPassword(newPassword)

  const now = new Date().toISOString()
  const passwordHash = await hashPassword(newPassword)
  await db
    .prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, fresh.id)
    .run()

  return publicUser(await findUserById(db, fresh.id))
}

export async function requestPasswordReset(env, { email, origin }) {
  const normalized = optionalEmail(email)
  if (!normalized) return

  // Réponse neutre : on ne révèle jamais si l'adresse existe. On ne fait le
  // travail (génération de jeton + envoi) que si un compte correspond ;
  // l'appelant (worker/routes/auth.js) renvoie la même réponse dans tous
  // les cas, que ce bloc s'exécute ou non.
  const user = await findUserByEmail(env.WOLTAR_DB, normalized)
  if (!user || user.disabled) return

  const rawToken = generateRawToken()
  const tokenHash = sha256Hex(rawToken)
  const now = Date.now()
  const expiresAt = new Date(now + PASSWORD_RESET_TTL_MS).toISOString()

  await env.WOLTAR_DB
    .prepare(
      'INSERT INTO account_tokens (id, user_id, purpose, token_hash, payload, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, NULL, ?, NULL, ?)',
    )
    .bind(`tok_${randomUUID()}`, user.id, 'password_reset', tokenHash, expiresAt, new Date(now).toISOString())
    .run()

  const link = `${origin}/compte/reinitialiser-mot-de-passe?token=${rawToken}`
  await sendMail(env, { to: user.email, ...passwordResetEmail(link) })
}

async function findAccountToken(db, rawToken, purpose) {
  const tokenHash = sha256Hex(String(rawToken || ''))
  const row = await db
    .prepare('SELECT * FROM account_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL')
    .bind(tokenHash, purpose)
    .first()
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null
  return row
}

async function consumeAccountToken(db, id) {
  await db.prepare('UPDATE account_tokens SET used_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run()
}

export async function resetPassword(env, { token, newPassword }) {
  if (!token) throw httpError(400, 'Jeton manquant.')
  const db = env.WOLTAR_DB
  const row = await findAccountToken(db, token, 'password_reset')
  if (!row) throw httpError(400, 'Ce lien de réinitialisation est invalide ou a expiré.')

  assertPassword(newPassword)
  const passwordHash = await hashPassword(newPassword)
  const now = new Date().toISOString()

  await db
    .prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, row.user_id)
    .run()
  // Invalidation immédiate après usage, dans tous les cas — ce jeton ne
  // doit plus jamais pouvoir resservir.
  await consumeAccountToken(db, row.id)
}

export async function requestEmailChange(env, actor, { newEmail, currentPassword, origin }) {
  const db = env.WOLTAR_DB
  const fresh = await findUserById(db, actor.id)
  if (!fresh) throw httpError(404, 'Compte introuvable.')
  if (!(await verifyPassword(String(currentPassword || ''), fresh.passwordHash))) {
    throw httpError(401, 'Mot de passe actuel incorrect.')
  }

  const normalized = optionalEmail(newEmail)
  if (!normalized || !normalized.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
  if (normalized === fresh.email) throw httpError(400, 'Cette adresse est déjà la tienne.')

  const existing = await findUserByEmail(db, normalized)
  if (existing) throw httpError(409, 'Cette adresse est déjà utilisée par un autre compte.')

  const rawToken = generateRawToken()
  const tokenHash = sha256Hex(rawToken)
  const now = Date.now()
  const expiresAt = new Date(now + EMAIL_CHANGE_TTL_MS).toISOString()

  await db
    .prepare(
      'INSERT INTO account_tokens (id, user_id, purpose, token_hash, payload, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)',
    )
    .bind(
      `tok_${randomUUID()}`,
      fresh.id,
      'email_change',
      tokenHash,
      JSON.stringify({ newEmail: normalized }),
      expiresAt,
      new Date(now).toISOString(),
    )
    .run()

  await db
    .prepare('UPDATE users SET pending_email = ?, updated_at = ? WHERE id = ?')
    .bind(normalized, new Date(now).toISOString(), fresh.id)
    .run()

  const link = `${origin}/compte/confirmer-email?token=${rawToken}`
  await sendMail(env, { to: normalized, ...emailChangeEmail(link) })

  return publicUser(await findUserById(db, fresh.id))
}

export async function confirmEmailChange(env, { token }) {
  if (!token) throw httpError(400, 'Jeton manquant.')
  const db = env.WOLTAR_DB
  const row = await findAccountToken(db, token, 'email_change')
  if (!row) throw httpError(400, 'Ce lien de confirmation est invalide ou a expiré.')

  let newEmail = ''
  try {
    newEmail = normalizeEmail(JSON.parse(row.payload || '{}').newEmail)
  } catch {
    newEmail = ''
  }
  if (!newEmail) throw httpError(400, 'Jeton corrompu.')

  // Recontrôlé au moment de la confirmation (pas seulement à la demande) :
  // une autre personne a pu prendre cette adresse entre-temps.
  const conflict = await findUserByEmail(db, newEmail)
  if (conflict && conflict.id !== row.user_id) {
    await consumeAccountToken(db, row.id)
    throw httpError(409, 'Cette adresse est déjà utilisée par un autre compte.')
  }

  const now = new Date().toISOString()
  await db
    .prepare(
      'UPDATE users SET email = ?, pending_email = NULL, session_version = session_version + 1, updated_at = ? WHERE id = ?',
    )
    .bind(newEmail, now, row.user_id)
    .run()
  await consumeAccountToken(db, row.id)

  return publicUser(await findUserById(db, row.user_id))
}
