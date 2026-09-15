import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { handleAuth } from '../worker/routes/auth.js'
import { handleAdmin } from '../worker/routes/admin.js'
import { handlePublic } from '../worker/routes/public.js'
import { loginUser, createSessionToken } from '../worker/lib/authStore.js'
import { HOME_DEFAULTS, HOME_FIELDS, normalizeHomeSettings } from '../src/lib/homeSettings.js'

test('Home settings: protected save, persistent public read, validation and defaults', async () => {
  const db = new DatabaseSync(':memory:')
  for (const file of ['0001_init', '0002_deprecate_personas', '0003_creator_profile_and_character_image_meta', '0004_clans_and_members', '0005_account_security', '0006_user_permissions_and_locations', '0007_optional_user_email', '0008_user_profiles', '0011_player_profile_characters']) db.exec(readFileSync(`migrations/${file}.sql`, 'utf8'))
  function statement(sql, params = []) { return { sql, params, bind(...next) { return statement(sql, next) }, async run() { return db.prepare(sql).run(...params) }, async first() { return db.prepare(sql).get(...params) ?? null }, async all() { return { results: db.prepare(sql).all(...params) } } } }
  const env = { AUTH_SESSION_SECRET: 'home-settings-test', ALLOW_PUBLIC_REGISTRATION: 'true', WOLTAR_DB: { prepare: sql => statement(sql), async batch(statements) { for (const s of statements) db.prepare(s.sql).run(...s.params) } } }
  const request = (method = 'GET', body, token = '') => new Request('https://test.local/', { method, headers: { 'Content-Type': 'application/json', Cookie: `woltar_session=${encodeURIComponent(token)}` }, body: body === undefined ? undefined : JSON.stringify(body) })
  const read = async () => (await (await handlePublic(request(), env, ['home'])).json()).data
  try {
    assert.deepEqual(await read(), HOME_DEFAULTS)
    const registered = await handleAuth(request('POST', { name: 'HomeEditor', email: 'editor@test.local', password: 'HomeTestPass123!' }), env, ['register'])
    const user = (await registered.json()).user
    assert(user)
    const member = createSessionToken(env, await loginUser(env, { identifier: 'HomeEditor', password: 'HomeTestPass123!' }))
    assert.equal((await handleAdmin(request('PUT', [{}]), env, ['collections', 'home'])).status, 401)
    assert.equal((await handleAdmin(request('PUT', [{}], member), env, ['collections', 'home'])).status, 403)
    assert.equal((await handleAdmin(request('POST', { filename: 'test.webp', dataUrl: 'data:image/webp;base64,AA==', kind: 'image' }, member), env, ['upload'])).status, 403)
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id)
    const admin = createSessionToken(env, await loginUser(env, { identifier: 'HomeEditor', password: 'HomeTestPass123!' }))
    for (const invalid of [[], [null], [[], {}], [{}, {}]]) assert.equal((await handleAdmin(request('PUT', invalid, admin), env, ['collections', 'home'])).status, 400)
    const input = { title: 'Nouvel accueil', cultureTitle: 'Nos traditions', windowImage: '/media/test.webp', lightBackgroundVideo: '', primaryCtaUrl: 'javascript:alert(1)', privateSecret: 'never-public' }
    assert.equal((await handleAdmin(request('PUT', [input], admin), env, ['collections', 'home'])).status, 200)
    const saved = await read()
    assert.equal(saved.title, input.title)
    assert.equal(saved.cultureTitle, input.cultureTitle)
    assert.equal(saved.windowImage, input.windowImage)
    assert.equal(saved.lightBackgroundVideo, '')
    assert.equal(saved.primaryCtaUrl, HOME_DEFAULTS.primaryCtaUrl)
    assert(!('privateSecret' in saved))
    assert.equal(JSON.parse(db.prepare("SELECT data FROM site_settings WHERE key = 'home'").get().data).title, input.title)
    assert.deepEqual((await (await handleAdmin(request('GET', undefined, admin), env, ['collections', 'home'])).json()).data, [saved])
    assert.equal(normalizeHomeSettings({ windowImage: '//evil.example/a', playersUrl: 'data:text/html,bad' }).windowImage, HOME_DEFAULTS.windowImage)
    assert.deepEqual(new Set(HOME_FIELDS.map(field => field.key)), new Set(Object.keys(HOME_DEFAULTS).filter(key => key !== 'id')))
  } finally { db.close() }
})
