import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

export const SESSION_COOKIE = 'woltar_session'
export const SYSTEM_OWNER_ID = 'system'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14

export const LOCAL_ADMIN_USER = {
  id: 'admin-local',
  email: 'admin@local.woltar',
  name: 'Admin local',
  role: 'admin',
  disabled: false,
  local: true,
}

function authDir(root) {
  return path.join(root, 'plugins', 'data')
}

function usersFile(root) {
  return path.join(authDir(root), 'users.json')
}

function secretFile(root) {
  return path.join(authDir(root), 'auth-secret.txt')
}

export function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

async function ensureAuthDir(root) {
  await mkdir(authDir(root), { recursive: true })
}

export async function loadUsers(root) {
  const file = usersFile(root)
  if (!existsSync(file)) return []
  return JSON.parse(await readFile(file, 'utf8'))
}

async function saveUsers(root, users) {
  await ensureAuthDir(root)
  await writeFile(usersFile(root), JSON.stringify(users, null, 2) + '\n', 'utf8')
}

async function readOrCreateSecret(root) {
  const file = secretFile(root)
  if (existsSync(file)) return (await readFile(file, 'utf8')).trim()
  await ensureAuthDir(root)
  const secret = randomBytes(48).toString('base64url')
  await writeFile(file, secret + '\n', 'utf8')
  return secret
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function assertPassword(password) {
  if (String(password || '').length < 8) {
    throw httpError(400, 'Le mot de passe doit contenir au moins 8 caracteres.')
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

export async function registerUser(root, payload) {
  const email = normalizeEmail(payload?.email)
  const name = String(payload?.name || '').trim()
  const password = String(payload?.password || '')

  if (!email || !email.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
  assertPassword(password)

  const users = await loadUsers(root)
  if (users.some((u) => normalizeEmail(u.email) === email)) {
    throw httpError(409, 'Un compte existe deja avec cette adresse.')
  }

  const now = new Date().toISOString()
  const user = {
    id: `user_${randomUUID()}`,
    email,
    name: name || email,
    role: users.length === 0 ? 'admin' : 'user',
    disabled: false,
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  }
  users.push(user)
  await saveUsers(root, users)
  return publicUser(user)
}

export async function loginUser(root, payload) {
  const email = normalizeEmail(payload?.email)
  const password = String(payload?.password || '')
  const users = await loadUsers(root)
  const user = users.find((u) => normalizeEmail(u.email) === email)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw httpError(401, 'Identifiants invalides.')
  }
  if (user.disabled) throw httpError(403, 'Ce compte est desactive.')
  return publicUser(user)
}

export async function listPublicUsers(root) {
  return (await loadUsers(root)).map(publicUser)
}

export async function updateUser(root, id, patch, actor) {
  if (!isAdmin(actor)) throw httpError(403, 'Reserve admin.')
  const users = await loadUsers(root)
  const index = users.findIndex((u) => u.id === id)
  if (index < 0) throw httpError(404, 'Utilisateur introuvable.')

  const next = { ...users[index] }
  if (typeof patch?.name === 'string') next.name = patch.name.trim() || next.email
  if (patch?.role === 'admin' || patch?.role === 'user') next.role = patch.role
  if (typeof patch?.disabled === 'boolean') {
    if (actor.id === id && patch.disabled) {
      throw httpError(400, 'Impossible de desactiver le compte admin connecte.')
    }
    next.disabled = patch.disabled
  }
  // Reset de mot de passe assiste par un admin, meme principe qu'en
  // production (voir worker/lib/authStore.js) : pas de flux self-service
  // par e-mail pour l'instant.
  if (typeof patch?.password === 'string' && patch.password) {
    assertPassword(patch.password)
    next.passwordHash = await hashPassword(patch.password)
  }
  next.updatedAt = new Date().toISOString()
  users[index] = next
  await saveUsers(root, users)
  return publicUser(next)
}

function sign(secret, payload) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export async function createSessionToken(root, user) {
  const secret = await readOrCreateSecret(root)
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    }),
  ).toString('base64url')
  return `${payload}.${sign(secret, payload)}`
}

async function verifySessionToken(root, token) {
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature) return null
  const secret = await readOrCreateSecret(root)
  const expected = sign(secret, payload)
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null
  }
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null
  return data
}

export function getCookie(req, name) {
  const header = req.headers.cookie || ''
  const parts = header.split(';').map((part) => part.trim())
  const found = parts.find((part) => part.startsWith(`${name}=`))
  return found ? decodeURIComponent(found.slice(name.length + 1)) : ''
}

export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  )
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
}

export async function getRequestUser(root, req) {
  const token = getCookie(req, SESSION_COOKIE)
  if (!token) return null

  const payload = await verifySessionToken(root, token).catch(() => null)
  if (!payload?.sub) return null
  if (payload.sub === LOCAL_ADMIN_USER.id) return { ...LOCAL_ADMIN_USER }

  const users = await loadUsers(root)
  const user = users.find((u) => u.id === payload.sub)
  if (!user || user.disabled) return null
  return publicUser(user)
}
