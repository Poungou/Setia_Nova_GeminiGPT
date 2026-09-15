import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import woltarCulture from '../plugins/woltar-culture.js'
import { createSessionToken, LOCAL_ADMIN_USER, SESSION_COOKIE } from '../plugins/lib/authStore.js'
import { cultureStore } from '../worker/lib/cultureStore.js'
import { cultureRequest } from '../worker/lib/cultureService.js'

const migration = await readFile(new URL('../migrations/0013_culture.sql', import.meta.url), 'utf8')
function setup() {
  const sql = new DatabaseSync(':memory:')
  sql.exec('PRAGMA foreign_keys = ON;')
  sql.exec(migration)
  function prepare(query) {
    let args = []
    return {
      bind(...values) { args = values; return this },
      first() { return sql.prepare(query).get(...args) || null },
      all() { return { results: sql.prepare(query).all(...args) } },
      run() { const result = sql.prepare(query).run(...args); return { meta: { changes: Number(result.changes) } } },
    }
  }
  const db = { prepare, batch(statements) { sql.exec('BEGIN'); try { const result = statements.map(s => s.run()); sql.exec('COMMIT'); return result } catch (e) { sql.exec('ROLLBACK'); throw e } } }
  const store = cultureStore(db)
  const request = async (actor, method, path, body, origin) => {
    const res = await cultureRequest(new Request(`https://culture.test/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }), path.split('/'), { store, getUser: async () => actor })
    return { status: res.status, ...await res.json() }
  }
  return { sql, store, request }
}
const alice = { id: 'alice', name: 'Alice', role: 'user' }
const bob = { id: 'bob', name: 'Bob', role: 'user' }
const admin = { id: 'admin', name: 'Admin', role: 'admin' }
const draft = { title: 'Le thé des retrouvailles', summary: 'Une coutume familiale.', body: '## Au crépuscule\nOn partage une tasse.', tagIds: ['coutumes'] }

test('Culture: publication immédiate, identité fiable, contrôle des propriétaires et administration', async () => {
  const { sql, request } = setup()
  try {
    assert.equal((await request(null, 'POST', 'posts', draft)).status, 401)
    assert.equal((await request({ ...alice, disabled: true }, 'POST', 'posts', draft)).status, 401)
    assert.equal((await request(alice, 'POST', 'posts', draft, 'https://other.test')).status, 403)
    const result = await request(alice, 'POST', 'posts', { ...draft, ownerUserId: 'admin', authorName: 'Forged', visibility: 'draft' })
    assert.equal(result.status, 201)
    assert.equal(result.data.ownerUserId, alice.id)
    assert.equal(result.data.authorName, alice.name)
    assert.equal((await request(null, 'GET', 'posts')).data.length, 1)
    const url = `posts/${result.data.id}`
    assert.equal((await request(bob, 'PUT', url, { ...result.data, title: 'Hijack' })).status, 403)
    assert.equal((await request(bob, 'DELETE', url)).status, 403)
    assert.equal((await request(alice, 'PUT', url, { ...result.data, updatedAt: 'stale' })).status, 409)
    const updated = await request(admin, 'PUT', url, { ...result.data, title: 'Un rituel de famille' })
    assert.equal(updated.status, 200)
    assert.equal(updated.data.ownerUserId, alice.id)
    assert.equal(updated.data.authorName, alice.name)
    assert.equal((await request(admin, 'DELETE', url)).status, 200)
    assert.equal((await request(null, 'GET', url)).status, 404)
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM culture_post_tags').get().n, 0)
  } finally { sql.close() }
})

test('Culture: seuls les admins gèrent les hashtags, renommer et supprimer préserve les textes', async () => {
  const { sql, request } = setup()
  try {
    assert.equal((await request(alice, 'POST', 'tags', { name: 'Rituels' })).status, 403)
    assert.equal((await request(bob, 'DELETE', 'tags/coutumes')).status, 403)
    const tag = await request(admin, 'POST', 'tags', { name: '#Rituels' })
    assert.equal(tag.status, 201)
    assert.equal((await request(admin, 'POST', 'tags', { name: 'rituels' })).status, 409)
    assert.equal((await request(admin, 'POST', 'tags', { name: 'Deux mots' })).status, 400)
    const post = await request(alice, 'POST', 'posts', { ...draft, tagIds: [tag.data.id] })
    assert.equal((await request(admin, 'PUT', `tags/${tag.data.id}`, { name: 'Traditions' })).status, 200)
    assert.equal((await request(null, 'GET', `posts/${post.data.id}`)).data.tagIds[0], tag.data.id)
    assert.equal((await request(admin, 'DELETE', `tags/${tag.data.id}`)).status, 200)
    const preserved = await request(null, 'GET', `posts/${post.data.id}`)
    assert.equal(preserved.data.body, draft.body)
    assert.deepEqual(preserved.data.tagIds, [])
  } finally { sql.close() }
})

test('Culture: champs invalides refusés et écritures atomiques', async () => {
  const { sql, request, store } = setup()
  try {
    for (const changes of [{ title: '' }, { title: 'a'.repeat(141) }, { body: '' }, { body: 'a'.repeat(50001) }, { tagIds: ['unknown'] }, { tagIds: 'coutumes' }, { image: 'javascript:alert(1)' }, { image: '//external.test/img' }]) {
      assert.equal((await request(alice, 'POST', 'posts', { ...draft, ...changes })).status, 400)
    }
    assert.equal((await request(alice, 'POST', 'posts', null)).status, 400)
    const { data: original } = await request(alice, 'POST', 'posts', draft)
    await assert.rejects(store.savePost({ ...original, title: 'Must roll back', updatedAt: 'future', tagIds: ['deleted-tag'] }, false, original.updatedAt))
    assert.equal((await store.post(original.id)).title, original.title)
    await assert.rejects(store.savePost({ ...original, title: 'Concurrent overwrite', updatedAt: 'future', tagIds: [] }, false, 'stale'), { status: 409 })
    assert.deepEqual((await store.post(original.id)).tagIds, original.tagIds)
    await store.savePost({ ...original, title: 'First writer', updatedAt: 'future', tagIds: ['cuisine'] }, false, original.updatedAt)
    await assert.rejects(store.savePost({ ...original, title: 'Second writer', updatedAt: 'future', tagIds: ['croyances'] }, false, original.updatedAt), { status: 409 })
    const winner = await store.post(original.id)
    assert.equal(winner.title, 'First writer')
    assert.deepEqual(winner.tagIds, ['cuisine'])
    assert.equal(winner._writeToken, undefined)
  } finally { sql.close() }
})

test('Culture locale: session réelle, persistance et contributions simultanées', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nova-culture-test-'))
  let handler
  const server = createServer((req, res) => handler(req, res))
  try {
    woltarCulture().configureServer({ config: { root }, middlewares: { use: (_route, callback) => { handler = callback } } })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const origin = `http://127.0.0.1:${server.address().port}`
    const cookie = `${SESSION_COOKIE}=${await createSessionToken(root, LOCAL_ADMIN_USER)}`
    const send = (url, data, auth = true) => fetch(origin + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Cookie: cookie } : {}) }, body: JSON.stringify(data) })
    assert.equal((await send('/posts', { ...draft, tagIds: [] }, false)).status, 401)
    const tagResponse = await send('/tags', { name: 'Voyages' })
    assert.equal(tagResponse.status, 201)
    const { data: tag } = await tagResponse.json()
    const results = await Promise.all(Array.from({ length: 4 }, (_, i) => send('/posts', { ...draft, title: `Voyage ${i}`, tagIds: [tag.id] })))
    assert(results.every(res => res.status === 201))
    const saved = JSON.parse(await readFile(path.join(root, 'plugins/data/culture.json'), 'utf8'))
    assert.equal(saved.posts.length, 4)
    const published = await (await fetch(origin + '/posts')).json()
    assert.equal(published.data.length, 4)
    assert.equal(published.data[0].authorName, LOCAL_ADMIN_USER.name)
  } finally {
    await new Promise(resolve => server.close(resolve))
    assert(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep))
    assert(path.basename(root).startsWith('nova-culture-test-'))
    await rm(root, { recursive: true, force: true })
  }
})
