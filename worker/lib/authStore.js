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

import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

export const SESSION_COOKIE = 'woltar_session'
export const SYSTEM_OWNER_ID = 'system'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14

export function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
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

function rowToUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    disabled: Boolean(row.disabled),
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
  const row = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  return rowToUser(row)
}

async function findUserById(db, id) {
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
  return rowToUser(row)
}

export async function registerUser(env, payload) {
  const db = env.WOLTAR_DB
  const email = normalizeEmail(payload?.email)
  const name = String(payload?.name || '').trim()
  const password = String(payload?.password || '')

  if (!email || !email.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
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
    name: name || email,
    role: 'user',
    disabled: false,
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  }

  await db
    .prepare(
      'INSERT INTO users (id, email, name, role, disabled, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)',
    )
    .bind(user.id, user.email, user.name, user.role, user.passwordHash, user.createdAt, user.updatedAt)
    .run()

  return publicUser(user)
}

export async function loginUser(env, payload) {
  const email = normalizeEmail(payload?.email)
  const password = String(payload?.password || '')
  const user = await findUserByEmail(env.WOLTAR_DB, email)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw httpError(401, 'Identifiants invalides.')
  }
  if (user.disabled) throw httpError(403, 'Ce compte est désactivé.')
  return publicUser(user)
}

export async function listPublicUsers(env) {
  const { results } = await env.WOLTAR_DB.prepare('SELECT * FROM users ORDER BY created_at ASC').all()
  return (results || []).map((row) => publicUser(rowToUser(row)))
}

export async function updateUser(env, id, patch, actor) {
  if (!isAdmin(actor)) throw httpError(403, 'Réservé admin.')
  const db = env.WOLTAR_DB
  const existing = await findUserById(db, id)
  if (!existing) throw httpError(404, 'Utilisateur introuvable.')

  const next = { ...existing }
  if (typeof patch?.name === 'string') next.name = patch.name.trim() || next.email
  if (patch?.role === 'admin' || patch?.role === 'user') next.role = patch.role
  if (typeof patch?.disabled === 'boolean') {
    if (actor.id === id && patch.disabled) {
      throw httpError(400, 'Impossible de désactiver le compte admin connecté.')
    }
    next.disabled = patch.disabled
  }
  // Reset de mot de passe assisté par un admin (§ "mot de passe oublié") :
  // pas de flux self-service par e-mail pour l'instant (aucun fournisseur
  // d'envoi configuré) — un admin peut fixer un nouveau mot de passe depuis
  // /admin → Utilisateurs, sans jamais avoir à toucher D1 à la main.
  if (typeof patch?.password === 'string' && patch.password) {
    assertPassword(patch.password)
    next.passwordHash = await hashPassword(patch.password)
  }
  next.updatedAt = new Date().toISOString()

  await db
    .prepare('UPDATE users SET name = ?, role = ?, disabled = ?, password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(next.name, next.role, next.disabled ? 1 : 0, next.passwordHash, next.updatedAt, id)
    .run()

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
    JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS }),
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
  return publicUser(user)
}
