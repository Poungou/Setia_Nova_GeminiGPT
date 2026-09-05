import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

let passed = 0; let failed = 0
function assert(condition, label) { if (condition) { passed++; console.log(`  OK  ${label}`) } else { failed++; console.error(`  FAIL ${label}`) } }
function wrapDb(db) { function bound(sql, params = []) { return { bind(...next) { return bound(sql, next) }, async run() { db.prepare(sql).run(...params) }, async first() { return db.prepare(sql).get(...params) ?? null }, async all() { return { results: db.prepare(sql).all(...params) } } } } return { prepare: (sql) => bound(sql) } }
const db = new DatabaseSync(':memory:')
for (const file of ['migrations/0001_init.sql', 'migrations/0002_deprecate_personas.sql', 'migrations/0003_creator_profile_and_character_image_meta.sql', 'migrations/0004_clans_and_members.sql', 'migrations/0005_account_security.sql', 'migrations/0006_user_permissions_and_locations.sql', 'migrations/0007_optional_user_email.sql', 'migrations/0008_user_profiles.sql', 'migrations/0010_user_posts.sql']) db.exec(readFileSync(file, 'utf8'))
const env = { WOLTAR_DB: wrapDb(db), AUTH_SESSION_SECRET: 'journal-test', ALLOW_PUBLIC_REGISTRATION: 'true' }
const { handleAuth } = await import('../worker/routes/auth.js'); const { handleAccount } = await import('../worker/routes/account.js'); const { handlePublic } = await import('../worker/routes/public.js'); const { loginUser, createSessionToken } = await import('../worker/lib/authStore.js')
function request(path, method = 'GET', body, token = '') { const headers = { 'Content-Type': 'application/json' }; if (token) headers.Cookie = `woltar_session=${encodeURIComponent(token)}`; return new Request(`https://test.local${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }) }
async function register(email, name) { const response = await handleAuth(request('/__auth/api/register', 'POST', { email, name, password: 'JournalPass123' }), env, ['register']); return (await response.json()).user }
const adminUser = await register('admin-journal@test.local', 'Poungou'); db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminUser.id); const admin = createSessionToken(env, await loginUser(env, { identifier: 'Poungou', password: 'JournalPass123' }))
const tallouna = await register('tallouna-journal@test.local', 'Tallouna'); let tallounaToken = createSessionToken(env, await loginUser(env, { identifier: 'Tallouna', password: 'JournalPass123' }))
const create = (token, id, title) => handleAccount(request('/__account/api/collections/posts', 'POST', { id, title, date: '2026-09-04', visibility: 'published' }, token), env, ['collections', 'posts'])
assert((await create(tallounaToken, 'tallouna-journal', 'Premier article')).status === 403, 'permission OFF refuse la création d’article')
await handleAuth(request(`/__auth/api/users/${tallouna.id}`, 'PATCH', { permissions: { create_journal_article: true } }, admin), env, ['users', tallouna.id])
tallounaToken = createSessionToken(env, await loginUser(env, { identifier: 'Tallouna', password: 'JournalPass123' }))
assert((await create(tallounaToken, 'tallouna-journal', 'Premier article')).status === 200, 'permission ON autorise la création d’article')
assert(db.prepare('SELECT owner_user_id FROM posts WHERE id = ?').get('tallouna-journal')?.owner_user_id === tallouna.id, 'l’article est lié à Tallouna')
const ownEdit = await handleAccount(request('/__account/api/collections/posts/tallouna-journal', 'PUT', { title: 'Article modifié', visibility: 'published' }, tallounaToken), env, ['collections', 'posts', 'tallouna-journal'])
assert(ownEdit.status === 200, 'Tallouna peut modifier son article')
const adminPost = await create(admin, 'poungou-journal', 'Article Poungou')
assert(adminPost.status === 200, 'admin peut créer un article')
const foreignEdit = await handleAccount(request('/__account/api/collections/posts/poungou-journal', 'PUT', { title: 'Interdit' }, tallounaToken), env, ['collections', 'posts', 'poungou-journal'])
assert(foreignEdit.status === 403, 'Tallouna ne peut pas modifier un article de Poungou')
const publicPosts = await handlePublic(request('/__public/api/posts'), env, ['posts'])
assert((await publicPosts.json()).data.some((post) => post.id === 'tallouna-journal' && post.title === 'Article modifié'), 'l’article publié est visible publiquement')
const publicDetail = await handlePublic(request('/__public/api/posts/tallouna-journal'), env, ['posts', 'tallouna-journal'])
assert((await publicDetail.json()).data?.id === 'tallouna-journal', 'la fiche publique de l’article est accessible')
const adminEdit = await handleAccount(request('/__account/api/collections/posts/tallouna-journal', 'PUT', { title: 'Modifié par admin', visibility: 'published' }, admin), env, ['collections', 'posts', 'tallouna-journal'])
assert((await adminEdit.json()).row.title === 'Modifié par admin', 'admin peut modifier l’article de Tallouna')
await handleAuth(request(`/__auth/api/users/${tallouna.id}`, 'PATCH', { permissions: { create_journal_article: false } }, admin), env, ['users', tallouna.id])
tallounaToken = createSessionToken(env, await loginUser(env, { identifier: 'Tallouna', password: 'JournalPass123' }))
assert((await create(tallounaToken, 'tallouna-second', 'Refusé')).status === 403, 'retrait de permission refuse les nouvelles créations')
const retained = await handleAccount(request('/__account/api/collections/posts', 'GET', undefined, tallounaToken), env, ['collections', 'posts'])
assert((await retained.json()).data.some((post) => post.id === 'tallouna-journal'), 'le retrait conserve les articles existants')
// The visual editor uses the same body field and publication routes.
const richBody = '<h2>Une chronique</h2><p>Un récit <strong>en gras</strong> et <em>en italique</em>.</p><blockquote><p>Une voix RP.</p></blockquote><ul><li>Une piste</li></ul><p><a href="https://example.test">Une source</a></p><figure><img src="/media/test.webp" alt="Un lieu"><figcaption>Le lieu au matin</figcaption></figure><hr><p>La suite.</p>'
const richCreate = await handleAccount(request('/__account/api/collections/posts', 'POST', { id: 'rich-journal', title: 'Chronique illustrée', author: 'Une plume', date: '2026-09-05', category: 'Chronique', excerpt: 'Une accroche', cover: '/media/cover.webp', body: richBody, visibility: 'draft' }, admin), env, ['collections', 'posts'])
assert(richCreate.status === 200, 'éditeur riche réutilise la création D1 existante')
const richDraft = (await richCreate.json()).row
const readRich = () => handlePublic(request('/__public/api/posts/rich-journal'), env, ['posts', 'rich-journal'])
assert((await readRich()).status === 404, 'brouillon riche absent de la lecture publique')
assert(!(await (await handlePublic(request('/__public/api/posts'), env, ['posts'])).json()).data.some((post) => post.id === 'rich-journal'), 'brouillon riche absent de la liste publique')
const publish = await handleAccount(request('/__account/api/collections/posts/rich-journal', 'PUT', { ...richDraft, visibility: 'published' }, admin), env, ['collections', 'posts', 'rich-journal'])
assert(publish.status === 200, 'publication explicite via la route existante')
const richPublic = (await (await readRich()).json()).data
assert(richPublic.body === richBody, 'D1 conserve le texte riche, les figures et les légendes')
assert(richPublic.author === 'Une plume' && richPublic.excerpt === 'Une accroche' && richPublic.cover === '/media/cover.webp', 'métadonnées éditoriales conservées lors de la publication')
const legacyBody = '## Une chronique ancienne\n\nUn **souvenir** et une [piste](https://example.test).'
const legacyCreate = await handleAccount(request('/__account/api/collections/posts', 'POST', { id: 'legacy-journal', title: 'Ancien article', body: legacyBody, visibility: 'published' }, admin), env, ['collections', 'posts'])
const legacyRow = (await legacyCreate.json()).row
await handleAccount(request('/__account/api/collections/posts/legacy-journal', 'PUT', { ...legacyRow, title: 'Titre corrigé' }, admin), env, ['collections', 'posts', 'legacy-journal'])
const legacyPublic = (await (await handlePublic(request('/__public/api/posts/legacy-journal'), env, ['posts', 'legacy-journal'])).json()).data
assert(legacyPublic.body === legacyBody, 'modifier les métadonnées ne réécrit pas le Markdown historique')
const foreignRich = await handleAccount(request('/__account/api/collections/posts/rich-journal', 'PUT', { body: '<p>Remplacement interdit</p>' }, tallounaToken), env, ['collections', 'posts', 'rich-journal'])
assert(foreignRich.status === 403 && (await (await readRich()).json()).data.body === richBody, 'éditeur riche conserve la protection par propriétaire')
await handleAccount(request('/__account/api/collections/posts/rich-journal', 'PUT', { ...richPublic, visibility: 'draft' }, admin), env, ['collections', 'posts', 'rich-journal'])
assert((await readRich()).status === 404, 'repasser en brouillon retire la lecture publique')
console.log(`\n${passed} OK, ${failed} FAIL`); if (failed) process.exitCode = 1
