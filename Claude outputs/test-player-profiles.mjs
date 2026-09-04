import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
let passed = 0; let failed = 0
function assert(condition, label) { if (condition) { passed++; console.log(`  OK  ${label}`) } else { failed++; console.error(`  FAIL ${label}`) } }
function wrapDb(db) { function bound(sql, params = []) { return { sql, params, bind(...next) { return bound(sql, next) }, async run() { db.prepare(sql).run(...params) }, async first() { return db.prepare(sql).get(...params) ?? null }, async all() { return { results: db.prepare(sql).all(...params) } } } } return { prepare: (sql) => bound(sql), async batch(statements) { db.exec('BEGIN'); try { for (const statement of statements) db.prepare(statement.sql).run(...statement.params); db.exec('COMMIT') } catch (error) { db.exec('ROLLBACK'); throw error } } } }
const db = new DatabaseSync(':memory:')
for (const file of ['migrations/0001_init.sql','migrations/0002_deprecate_personas.sql','migrations/0003_creator_profile_and_character_image_meta.sql','migrations/0004_clans_and_members.sql','migrations/0005_account_security.sql','migrations/0006_user_permissions_and_locations.sql','migrations/0007_optional_user_email.sql','migrations/0008_user_profiles.sql']) db.exec(readFileSync(file, 'utf8'))
const env = { WOLTAR_DB: wrapDb(db), AUTH_SESSION_SECRET: 'profile-test', ALLOW_PUBLIC_REGISTRATION: 'true' }
const { handleAuth } = await import('../worker/routes/auth.js')
const { handlePublic } = await import('../worker/routes/public.js')
const { handleAccount } = await import('../worker/routes/account.js')
const { loginUser, createSessionToken } = await import('../worker/lib/authStore.js')
function request(path, method = 'GET', body, cookie = '') { const headers = { 'Content-Type': 'application/json' }; if (cookie) headers.Cookie = `woltar_session=${encodeURIComponent(cookie)}`; return new Request(`https://test.local${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }) }
async function register(email, name) { const response = await handleAuth(request('/__auth/api/register', 'POST', { email, name, password: 'ProfilePass123' }), env, ['register']); return (await response.json()).user }
const poungou = await register('poungou-profile@test.local', 'Poungou'); db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(poungou.id); const admin = await loginUser(env, { identifier: 'Poungou', password: 'ProfilePass123' }); const adminSession = createSessionToken(env, admin)
await handleAuth(request(`/__auth/api/users/${poungou.id}/profile`, 'PUT', { avatar: '/media/avatar.png', player_intro: 'Quelques mots', writing_style: 'Narration', univers: 'Univers RP', tw: 'A discuter', rhythm: 'Hebdomadaire', ig_username: 'PoungouIG', profile_public: true }, adminSession), env, ['users', poungou.id, 'profile'])
db.prepare('INSERT INTO characters (id, owner_user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('poungou-character', poungou.id, JSON.stringify({ firstName: 'Kazuko', lastName: 'Nakamura', visibility: 'published' }), new Date().toISOString(), new Date().toISOString())
const publicResponse = await handlePublic(request('/__public/api/players'), env, ['players']); const players = (await publicResponse.json()).data; const player = players.find((entry) => entry.userId === poungou.id)
assert(publicResponse.status === 200 && player?.name === 'Poungou', 'Poungou apparaît dans les joueurs publics')
assert(player.profile.player_intro === 'Quelques mots' && player.profile.univers === 'Univers RP', 'les catégories du profil sont exposées')
assert(player.characters[0]?.id === 'poungou-character', 'les personnages sont résolus par owner_user_id')
assert(!JSON.stringify(player).includes('email') && !JSON.stringify(player).includes('password'), 'aucune donnée privée dans le profil public')
const tallouna = await register('', 'Tallouna'); const tallounaSession = createSessionToken(env, await loginUser(env, { identifier: 'Tallouna', password: 'ProfilePass123' }))
const forbidden = await handleAccount(request(`/__account/api/profile/${poungou.id}`, 'PUT', { profile_public: false }, tallounaSession), env, ['profile', poungou.id])
assert(forbidden.status === 200, 'la route compte reste limitée au profil de la session')
const stillPublic = await handlePublic(request('/__public/api/players'), env, ['players']); assert((await stillPublic.json()).data.some((entry) => entry.userId === poungou.id), 'Tallouna ne peut pas masquer le profil de Poungou')
console.log(`\n${passed} OK, ${failed} FAIL`); if (failed) process.exitCode = 1
