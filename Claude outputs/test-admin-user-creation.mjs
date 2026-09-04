import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

let passed = 0
let failed = 0
function assert(condition, label) {
  if (condition) { passed++; console.log(`  OK  ${label}`) }
  else { failed++; console.error(`  FAIL ${label}`) }
}
function wrapDb(db) {
  function bound(sql, params = []) {
    return {
      sql,
      params,
      bind(...next) { return bound(sql, next) },
      async run() { db.prepare(sql).run(...params); return { success: true } },
      async first() { return db.prepare(sql).get(...params) ?? null },
      async all() { return { results: db.prepare(sql).all(...params) } },
    }
  }
  return {
    prepare: (sql) => bound(sql),
    async batch(statements) {
      db.exec('BEGIN')
      try {
        for (const statement of statements) db.prepare(statement.sql).run(...statement.params)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
  }
}

const sqlite = new DatabaseSync(':memory:')
for (const file of [
  'migrations/0001_init.sql', 'migrations/0002_deprecate_personas.sql',
  'migrations/0003_creator_profile_and_character_image_meta.sql',
  'migrations/0004_clans_and_members.sql', 'migrations/0005_account_security.sql',
  'migrations/0006_user_permissions_and_locations.sql',
  'migrations/0007_optional_user_email.sql',
]) sqlite.exec(readFileSync(file, 'utf8'))
const env = { WOLTAR_DB: wrapDb(sqlite), AUTH_SESSION_SECRET: 'admin-create-test', ALLOW_PUBLIC_REGISTRATION: 'true' }
const { handleAuth } = await import('../worker/routes/auth.js')
const { handleAccount } = await import('../worker/routes/account.js')
const { loginUser, createSessionToken } = await import('../worker/lib/authStore.js')

function authRequest(path, method, body, cookie = '') {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = `woltar_session=${encodeURIComponent(cookie)}`
  return new Request(`https://test.local${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
}
async function register(email, name) {
  const response = await handleAuth(authRequest('/__auth/api/register', 'POST', { email, name, password: 'AdminPass123' }), env, ['register'])
  return (await response.json()).user
}

const admin = await register('admin-create@test.local', 'Admin')
sqlite.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.id)
const adminSession = createSessionToken(env, await loginUser(env, { email: admin.email, password: 'AdminPass123' }))
const createdResponse = await handleAuth(authRequest('/__auth/api/users', 'POST', {
  name: 'Tallouna', email: '', password: 'TallounaTemp123', passwordConfirmation: 'TallounaTemp123',
  role: 'user', status: 'RPiste', active: true,
  permissions: { create_character: true, create_clan: true, create_location: true },
}, adminSession), env, ['users'])
const createdBody = await createdResponse.json()
assert(createdResponse.status === 201, 'admin peut créer Tallouna')
assert(createdBody.user?.name === 'Tallouna' && createdBody.user?.status === 'RPiste', 'le profil créé contient pseudo et statut')
assert(createdBody.user?.email === null, 'Tallouna est créée sans email')
assert(!JSON.stringify(createdBody).includes('passwordHash') && !JSON.stringify(createdBody).includes('password_hash'), 'la réponse ne contient aucun hash')

const tallouna = await loginUser(env, { identifier: 'Tallouna', password: 'TallounaTemp123' })
assert(tallouna.role === 'user' && tallouna.permissions.create_location === true, 'Tallouna peut se connecter avec le mot de passe temporaire')
const tallounaSession = createSessionToken(env, tallouna)
const forbiddenAdmin = await handleAuth(authRequest('/__auth/api/users', 'GET', null, tallounaSession), env, ['users'])
assert(forbiddenAdmin.status === 403, 'Tallouna ne peut pas accéder à la route admin')

sqlite.prepare('INSERT INTO characters (id, owner_user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('tallouna-character', tallouna.id, '{}', new Date().toISOString(), new Date().toISOString())
const listResponse = await handleAuth(authRequest('/__auth/api/users', 'GET', null, adminSession), env, ['users'])
const listed = (await listResponse.json()).users.find((user) => user.id === tallouna.id)
assert(listed?.contentCounts?.characters === 1, 'la liste admin affiche le nombre de personnages')

const addedEmail = await handleAuth(authRequest(`/__auth/api/users/${tallouna.id}`, 'PATCH', { email: 'tallouna-added@test.local' }, adminSession), env, ['users', tallouna.id])
assert(addedEmail.status === 200, 'admin peut ajouter un email')
const emailLogin = await loginUser(env, { identifier: 'tallouna-added@test.local', password: 'TallounaTemp123' })
assert(emailLogin.id === tallouna.id, 'la connexion par email fonctionne après ajout')

const duplicate = await handleAuth(authRequest('/__auth/api/users', 'POST', {
  name: 'Autre', email: 'tallouna-added@test.local', password: 'ValidPass123', passwordConfirmation: 'ValidPass123',
}, adminSession), env, ['users'])
assert(duplicate.status === 409, 'un email déjà utilisé est refusé')

const removedEmail = await handleAuth(authRequest(`/__auth/api/users/${tallouna.id}`, 'PATCH', { email: '' }, adminSession), env, ['users', tallouna.id])
assert(removedEmail.status === 200 && (await removedEmail.clone().json()).user.email === null, 'admin peut supprimer complètement l’email')
const pseudoLogin = await loginUser(env, { identifier: 'Tallouna', password: 'TallounaTemp123' })
assert(pseudoLogin.id === tallouna.id, 'la reconnexion par pseudo fonctionne après suppression')
const forgotWithoutEmail = await handleAuth(authRequest('/__auth/api/forgot-password', 'POST', { email: '' }), env, ['forgot-password'])
assert(forgotWithoutEmail.status === 200, 'mot de passe oublié reste neutre sans email')

const disabled = await handleAuth(authRequest(`/__auth/api/users/${tallouna.id}`, 'PATCH', { disabled: true }, adminSession), env, ['users', tallouna.id])
assert(disabled.status === 200, 'admin peut désactiver Tallouna')
const invalidated = await handleAccount(authRequest('/__account/api/bootstrap', 'GET', null, tallounaSession), env, ['bootstrap'])
assert(invalidated.status === 401, 'la session de Tallouna est refusée après désactivation')


console.log(`\n${passed} OK, ${failed} FAIL`)
if (failed) process.exitCode = 1
