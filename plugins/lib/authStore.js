import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash, createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { emailChangeEmail, passwordResetEmail, sendMail } from './mailer.js'
import { normalizePermissions } from '../../worker/lib/permissions.js'

const scrypt = promisify(scryptCallback)

export const SESSION_COOKIE = 'woltar_session'
export const SYSTEM_OWNER_ID = 'system'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000
export const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000

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

// Jetons "mot de passe oublié" / "confirmation email" — équivalent dev de la
// table D1 account_tokens (migrations/0005_account_security.sql). Fichier
// ignoré par Git au même titre que users.json (voir .gitignore : plugins/data/).
function accountTokensFile(root) {
  return path.join(authDir(root), 'account-tokens.json')
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

async function loadAccountTokens(root) {
  const file = accountTokensFile(root)
  if (!existsSync(file)) return []
  return JSON.parse(await readFile(file, 'utf8'))
}

async function saveAccountTokens(root, tokens) {
  await ensureAuthDir(root)
  await writeFile(accountTokensFile(root), JSON.stringify(tokens, null, 2) + '\n', 'utf8')
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

function optionalEmail(email) {
  const value = normalizeEmail(email)
  return value || null
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

export function publicUser(user) {
  if (!user) return null
  const safe = { ...user }
  safe.status = safe.status || 'Membre'
  safe.permissions = normalizePermissions(safe.permissions)
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
  const email = optionalEmail(payload?.email)
  const name = String(payload?.name || '').trim()
  const password = String(payload?.password || '')

  if (!name) throw httpError(400, 'Le pseudo est obligatoire.')
  if (email && !email.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
  assertPassword(password)

  const users = await loadUsers(root)
  if (users.some((user) => String(user.name || '').toLowerCase() === name.toLowerCase())) {
    throw httpError(409, 'Ce pseudo est deja utilise.')
  }
  if (users.some((u) => normalizeEmail(u.email) === email)) {
    throw httpError(409, 'Un compte existe deja avec cette adresse.')
  }

  const now = new Date().toISOString()
  const user = {
    id: `user_${randomUUID()}`,
    email,
    name,
    role: users.length === 0 ? 'admin' : 'user',
    status: 'Membre',
    permissions: {},
    disabled: false,
    passwordHash: await hashPassword(password),
    sessionVersion: 0,
    createdAt: now,
    updatedAt: now,
  }
  users.push(user)
  await saveUsers(root, users)
  return publicUser(user)
}

export async function loginUser(root, payload) {
  const identifier = String(payload?.identifier ?? payload?.email ?? '').trim()
  const password = String(payload?.password || '')
  const users = await loadUsers(root)
  const userByEmail = users.find((u) => u.email && normalizeEmail(u.email) === normalizeEmail(identifier))
  const usersByName = users.filter((u) => String(u.name || '').toLowerCase() === identifier.toLowerCase())
  if (!userByEmail && usersByName.length > 1) throw httpError(409, 'Ce pseudo est ambigu, contacte une administratrice.')
  const user = userByEmail || usersByName[0]
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw httpError(401, 'Identifiants invalides.')
  }
  if (user.disabled) throw httpError(403, 'Ce compte est desactive.')
  return publicUser(user)
}

export async function listPublicUsers(root) {
  const users = await loadUsers(root)
  const dataDir = path.join(root, 'src', 'data')
  const count = async (name, ownerId) => {
    try {
      const rows = JSON.parse(await readFile(path.join(dataDir, `${name}.json`), 'utf8'))
      return rows.filter((row) => row.ownerUserId === ownerId).length
    } catch {
      return 0
    }
  }
  return Promise.all(users.map(async (user) => publicUser({
    ...user,
    contentCounts: {
      characters: await count('characters', user.id),
      clans: await count('clans', user.id),
      locations: await count('locations', user.id),
    },
  })))
}

export async function createUser(root, payload, actor) {
  if (!isAdmin(actor)) throw httpError(403, 'Reserve admin.')
  const email = optionalEmail(payload?.email)
  const name = String(payload?.name || '').trim()
  const password = String(payload?.password || '')
  const confirmation = String(payload?.passwordConfirmation || '')
  if (!name) throw httpError(400, 'Le pseudo est obligatoire.')
  if (email && !email.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
  assertPassword(password)
  if (password !== confirmation) throw httpError(400, 'La confirmation du mot de passe ne correspond pas.')

  const users = await loadUsers(root)
  if (users.some((user) => normalizeEmail(user.email) === email)) {
    throw httpError(409, 'Cette adresse e-mail est deja utilisee.')
  }
  if (users.some((user) => String(user.name || '').toLowerCase() === name.toLowerCase())) {
    throw httpError(409, 'Ce pseudo est deja utilise.')
  }
  const now = new Date().toISOString()
  const user = {
    id: `user_${randomUUID()}`,
    email,
    name,
    role: normalizeAdminRole(payload?.role || 'user'),
    status: normalizeAdminStatus(payload?.status),
    permissions: normalizePermissions(payload?.permissions),
    disabled: payload?.active === false,
    passwordHash: await hashPassword(password),
    sessionVersion: 0,
    createdAt: now,
    updatedAt: now,
  }
  users.push(user)
  await saveUsers(root, users)
  return publicUser(user)
}

export async function updateUser(root, id, patch, actor) {
  if (!isAdmin(actor)) throw httpError(403, 'Reserve admin.')
  const users = await loadUsers(root)
  const index = users.findIndex((u) => u.id === id)
  if (index < 0) throw httpError(404, 'Utilisateur introuvable.')

  const next = { ...users[index] }
  if (typeof patch?.name === 'string') {
    const name = patch.name.trim() || next.name
    if (users.some((user) => user.id !== id && String(user.name || '').toLowerCase() === name.toLowerCase())) {
      throw httpError(409, 'Ce pseudo est deja utilise.')
    }
    next.name = name
  }
  if (Object.prototype.hasOwnProperty.call(patch || {}, 'email')) {
    const email = optionalEmail(patch.email)
    if (email && !email.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
    const conflict = email && users.find((user) => user.id !== id && normalizeEmail(user.email) === email)
    if (conflict) throw httpError(409, 'Cette adresse e-mail est deja utilisee.')
    next.email = email
    if (email !== (users[index].email || null)) next.sessionVersion = (users[index].sessionVersion || 0) + 1
  }
  if (typeof patch?.status === 'string' && patch.status.trim()) next.status = patch.status.trim().slice(0, 80)
  if (patch?.role === 'admin' || patch?.role === 'user') next.role = patch.role
  if (typeof patch?.disabled === 'boolean') {
    if (actor.id === id && patch.disabled) {
      throw httpError(400, 'Impossible de desactiver le compte admin connecte.')
    }
    next.disabled = patch.disabled
  }
  // Reset de mot de passe assisté par un admin, même principe qu'en
  // production (voir worker/lib/authStore.js) — invalide aussi les autres
  // sessions actives de ce compte.
  if (typeof patch?.password === 'string' && patch.password) {
    assertPassword(patch.password)
    next.passwordHash = await hashPassword(patch.password)
    next.sessionVersion = (next.sessionVersion || 0) + 1
  }
  if (patch?.permissions && typeof patch.permissions === 'object' && !Array.isArray(patch.permissions)) {
    next.permissions = { ...normalizePermissions(next.permissions), ...normalizePermissions(patch.permissions) }
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
      ver: user.sessionVersion || 0,
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
  // Voir worker/lib/authStore.js#getRequestUser : même logique
  // d'invalidation par session_version, `ver` absent traité comme 0.
  if ((payload.ver || 0) !== (user.sessionVersion || 0)) return null
  return publicUser(user)
}

// --- Sécurisation du compte -------------------------------------------------

export async function changePassword(root, actor, { currentPassword, newPassword }) {
  const users = await loadUsers(root)
  const idx = users.findIndex((u) => u.id === actor.id)
  if (idx < 0) throw httpError(404, 'Compte introuvable.')
  const fresh = users[idx]
  if (!(await verifyPassword(String(currentPassword || ''), fresh.passwordHash))) {
    throw httpError(401, 'Mot de passe actuel incorrect.')
  }
  assertPassword(newPassword)

  users[idx] = {
    ...fresh,
    passwordHash: await hashPassword(newPassword),
    sessionVersion: (fresh.sessionVersion || 0) + 1,
    updatedAt: new Date().toISOString(),
  }
  await saveUsers(root, users)
  return publicUser(users[idx])
}

export async function requestPasswordReset(root, { email, origin }) {
  const normalized = optionalEmail(email)
  if (!normalized) return

  const users = await loadUsers(root)
  const user = users.find((u) => normalizeEmail(u.email) === normalized)
  if (!user || user.disabled) return

  const rawToken = generateRawToken()
  const tokenHash = sha256Hex(rawToken)
  const now = Date.now()
  const tokens = await loadAccountTokens(root)
  tokens.push({
    id: `tok_${randomUUID()}`,
    userId: user.id,
    purpose: 'password_reset',
    tokenHash,
    payload: null,
    expiresAt: new Date(now + PASSWORD_RESET_TTL_MS).toISOString(),
    usedAt: null,
    createdAt: new Date(now).toISOString(),
  })
  await saveAccountTokens(root, tokens)

  const link = `${origin}/compte/reinitialiser-mot-de-passe?token=${rawToken}`
  await sendMail(root, { to: user.email, ...passwordResetEmail(link) })
}

async function findAccountToken(root, rawToken, purpose) {
  const tokenHash = sha256Hex(String(rawToken || ''))
  const tokens = await loadAccountTokens(root)
  const token = tokens.find((t) => t.tokenHash === tokenHash && t.purpose === purpose && !t.usedAt)
  if (!token) return null
  if (new Date(token.expiresAt).getTime() < Date.now()) return null
  return token
}

async function consumeAccountToken(root, id) {
  const tokens = await loadAccountTokens(root)
  const idx = tokens.findIndex((t) => t.id === id)
  if (idx < 0) return
  tokens[idx] = { ...tokens[idx], usedAt: new Date().toISOString() }
  await saveAccountTokens(root, tokens)
}

export async function resetPassword(root, { token, newPassword }) {
  if (!token) throw httpError(400, 'Jeton manquant.')
  const found = await findAccountToken(root, token, 'password_reset')
  if (!found) throw httpError(400, 'Ce lien de réinitialisation est invalide ou a expiré.')

  assertPassword(newPassword)
  const users = await loadUsers(root)
  const idx = users.findIndex((u) => u.id === found.userId)
  if (idx < 0) throw httpError(404, 'Compte introuvable.')
  users[idx] = {
    ...users[idx],
    passwordHash: await hashPassword(newPassword),
    sessionVersion: (users[idx].sessionVersion || 0) + 1,
    updatedAt: new Date().toISOString(),
  }
  await saveUsers(root, users)
  await consumeAccountToken(root, found.id)
}

export async function requestEmailChange(root, actor, { newEmail, currentPassword, origin }) {
  const users = await loadUsers(root)
  const idx = users.findIndex((u) => u.id === actor.id)
  if (idx < 0) throw httpError(404, 'Compte introuvable.')
  const fresh = users[idx]
  if (!(await verifyPassword(String(currentPassword || ''), fresh.passwordHash))) {
    throw httpError(401, 'Mot de passe actuel incorrect.')
  }

  const normalized = optionalEmail(newEmail)
  if (!normalized || !normalized.includes('@')) throw httpError(400, 'Adresse e-mail invalide.')
  if (normalized === normalizeEmail(fresh.email)) throw httpError(400, 'Cette adresse est déjà la tienne.')
  if (users.some((u) => normalizeEmail(u.email) === normalized)) {
    throw httpError(409, 'Cette adresse est déjà utilisée par un autre compte.')
  }

  const rawToken = generateRawToken()
  const tokenHash = sha256Hex(rawToken)
  const now = Date.now()
  const tokens = await loadAccountTokens(root)
  tokens.push({
    id: `tok_${randomUUID()}`,
    userId: fresh.id,
    purpose: 'email_change',
    tokenHash,
    payload: JSON.stringify({ newEmail: normalized }),
    expiresAt: new Date(now + EMAIL_CHANGE_TTL_MS).toISOString(),
    usedAt: null,
    createdAt: new Date(now).toISOString(),
  })
  await saveAccountTokens(root, tokens)

  users[idx] = { ...fresh, pendingEmail: normalized, updatedAt: new Date().toISOString() }
  await saveUsers(root, users)

  const link = `${origin}/compte/confirmer-email?token=${rawToken}`
  await sendMail(root, { to: normalized, ...emailChangeEmail(link) })

  return publicUser(users[idx])
}

export async function confirmEmailChange(root, { token }) {
  if (!token) throw httpError(400, 'Jeton manquant.')
  const found = await findAccountToken(root, token, 'email_change')
  if (!found) throw httpError(400, 'Ce lien de confirmation est invalide ou a expiré.')

  let newEmail = ''
  try {
    newEmail = normalizeEmail(JSON.parse(found.payload || '{}').newEmail)
  } catch {
    newEmail = ''
  }
  if (!newEmail) throw httpError(400, 'Jeton corrompu.')

  const users = await loadUsers(root)
  const conflict = users.find((u) => normalizeEmail(u.email) === newEmail && u.id !== found.userId)
  if (conflict) {
    await consumeAccountToken(root, found.id)
    throw httpError(409, 'Cette adresse est déjà utilisée par un autre compte.')
  }

  const idx = users.findIndex((u) => u.id === found.userId)
  if (idx < 0) throw httpError(404, 'Compte introuvable.')
  users[idx] = {
    ...users[idx],
    email: newEmail,
    pendingEmail: null,
    sessionVersion: (users[idx].sessionVersion || 0) + 1,
    updatedAt: new Date().toISOString(),
  }
  await saveUsers(root, users)
  await consumeAccountToken(root, found.id)

  return publicUser(users[idx])
}
