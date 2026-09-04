// Test d'integration des permissions Nova-Setia sur les vrais handlers Worker.
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

let passed = 0
let failed = 0
function assert(condition, label) {
  if (condition) {
    passed++
    console.log(`  OK  ${label}`)
  } else {
    failed++
    console.error(`  FAIL ${label}`)
  }
}

function wrapDb(db) {
  function bound(sql, params = []) {
    return {
      bind(...next) { return bound(sql, next) },
      async run() { db.prepare(sql).run(...params); return { success: true } },
      async first() { return db.prepare(sql).get(...params) ?? null },
      async all() { return { results: db.prepare(sql).all(...params) } },
    }
  }
  return { prepare: (sql) => bound(sql) }
}

const sqlite = new DatabaseSync(':memory:')
for (const file of [
  'migrations/0001_init.sql',
  'migrations/0002_deprecate_personas.sql',
  'migrations/0003_creator_profile_and_character_image_meta.sql',
  'migrations/0004_clans_and_members.sql',
  'migrations/0005_account_security.sql',
  'migrations/0006_user_permissions_and_locations.sql',
  'migrations/0007_optional_user_email.sql',
  'migrations/0008_user_profiles.sql',
  'migrations/0010_user_posts.sql',
]) sqlite.exec(readFileSync(file, 'utf8'))

const env = {
  WOLTAR_DB: wrapDb(sqlite),
  AUTH_SESSION_SECRET: 'permissions-test-secret',
  ALLOW_PUBLIC_REGISTRATION: 'true',
}
const { handleAuth } = await import('../worker/routes/auth.js')
const { handleAccount } = await import('../worker/routes/account.js')
const { createSessionToken, loginUser } = await import('../worker/lib/authStore.js')

function request(body = {}, method = 'GET', cookie = '') {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = `woltar_session=${encodeURIComponent(cookie)}`
  return new Request('https://test.local/__account/api', { method, headers, body: method === 'GET' ? undefined : JSON.stringify(body) })
}

async function register(email, name) {
  const response = await handleAuth(new Request('https://test.local/__auth/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password: 'TallounaPass123' }),
  }), env, ['register'])
  return (await response.json()).user
}

const first = await register('admin@test.local', 'Admin')
sqlite.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(first.id)
const admin = await loginUser(env, { email: first.email, password: 'TallounaPass123' })
const adminCookie = createSessionToken(env, admin)
const tallouna = await register('tallouna@test.local', 'Tallouna')
const user = await loginUser(env, { email: tallouna.email, password: 'TallounaPass123' })
const userCookie = createSessionToken(env, user)

const updateUser = (id, patch) => handleAuth(new Request(`https://test.local/__auth/api/users/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Cookie: `woltar_session=${encodeURIComponent(adminCookie)}` },
  body: JSON.stringify(patch),
}), env, ['users', id])

const permissionResponse = await updateUser(tallouna.id, {
  status: 'RPiste',
  permissions: { create_character: true, create_clan: true, create_location: true, create_journal_article: true },
})
assert(permissionResponse.status === 200, 'admin peut definir le statut et les trois permissions')
const enabledUser = await loginUser(env, { email: tallouna.email, password: 'TallounaPass123' })
const enabledCookie = createSessionToken(env, enabledUser)

async function create(collection, id, extra = {}) {
  return handleAccount(
    request({ id, visibility: 'draft', name: id, ...extra }, 'POST', enabledCookie),
    env,
    ['collections', collection],
  )
}

assert((await create('characters', 'tallouna-character')).status === 200, 'create_character autorise la creation')
assert((await create('clans', 'tallouna-clan')).status === 200, 'create_clan autorise la creation')
assert((await create('locations', 'tallouna-location', { description: 'Lieu RP', image: '', image_source: 'credit' })).status === 200, 'create_location autorise la creation')
assert((await create('posts', 'tallouna-article', { title: 'Journal Tallouna', visibility: 'draft' })).status === 200, 'create_journal_article autorise la creation')

const revoke = await updateUser(tallouna.id, { permissions: { create_character: false, create_clan: false, create_location: false, create_journal_article: false } })
assert(revoke.status === 200, 'admin peut retirer les permissions')
const revokedUser = await loginUser(env, { email: tallouna.email, password: 'TallounaPass123' })
const revokedCookie = createSessionToken(env, revokedUser)
for (const collection of ['characters', 'clans', 'locations', 'posts']) {
  const response = await handleAccount(request({ id: `blocked-${collection}` }, 'POST', revokedCookie), env, ['collections', collection])
  assert(response.status === 403, `permission retiree refuse POST ${collection}`)
}
const retained = await handleAccount(request({}, 'GET', revokedCookie), env, ['collections', 'characters'])
const retainedBody = await retained.json()
assert(retained.status === 200 && retainedBody.data.some((row) => row.id === 'tallouna-character'), 'contenu existant conserve apres retrait')

const selfPatch = await handleAuth(new Request(`https://test.local/__auth/api/users/${tallouna.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Cookie: `woltar_session=${encodeURIComponent(userCookie)}` },
  body: JSON.stringify({ permissions: { create_location: true }, role: 'admin' }),
}), env, ['users', tallouna.id])
assert(selfPatch.status === 403, 'un user ne peut pas modifier ses permissions ou son role')

const adminCreate = await handleAccount(request({ id: 'admin-location' }, 'POST', adminCookie), env, ['collections', 'locations'])
assert(adminCreate.status === 200, 'admin conserve tous les droits sans permission explicite')

console.log(`\n${passed} OK, ${failed} FAIL`)
if (failed) process.exitCode = 1
