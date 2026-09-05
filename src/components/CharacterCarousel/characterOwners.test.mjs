import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { handlePublic } from '../../../worker/routes/public.js'
import woltarPublic from '../../../plugins/woltar-public.js'

const users = [
  { id: 'active', name: 'Player', disabled: false, email: 'private@example.test', password_hash: 'private' },
  { id: 'draft-only', name: 'Draft', disabled: false },
  { id: 'disabled', name: 'Disabled', disabled: true },
  { id: 'no-character', name: 'Empty', disabled: false },
]
const characters = [
  { id: 'public-one', ownerUserId: 'active', visibility: 'published' },
  { id: 'public-two', ownerUserId: 'active', visibility: 'published' },
  { id: 'draft-one', ownerUserId: 'draft-only', visibility: 'draft' },
  { id: 'disabled-one', ownerUserId: 'disabled', visibility: 'published' },
  { id: 'official-one', ownerUserId: 'system', visibility: 'published' },
  { id: 'orphan-one', ownerUserId: 'missing', visibility: 'published' },
]
const expected = [{ userId: 'active', name: 'Player' }]

test('Worker owners: public characters, no public RP profile required, no private fields or duplicates', async () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('CREATE TABLE users (id TEXT, name TEXT, disabled INTEGER, email TEXT, password_hash TEXT); CREATE TABLE characters (id TEXT, owner_user_id TEXT, data TEXT, created_at TEXT)')
    for (const user of users) db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(user.id, user.name, Number(user.disabled), user.email || '', user.password_hash || '')
    for (const character of characters) db.prepare('INSERT INTO characters VALUES (?, ?, ?, ?)').run(character.id, character.ownerUserId, JSON.stringify(character), '2026-09-05')
    const statement = (sql, values = []) => ({
      bind: (...next) => statement(sql, next),
      all: async () => ({ results: db.prepare(sql).all(...values) }),
    })
    const env = { WOLTAR_DB: { prepare: (sql) => statement(sql) } }
    const request = new Request('https://test.local/__public/api/character-owners')
    const response = await handlePublic(request, env, ['character-owners'])
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json()).data, expected)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    const forbidden = await handlePublic(new Request(request.url, { method: 'POST' }), env, ['character-owners'])
    assert.equal(forbidden.status, 405)
    db.prepare('UPDATE characters SET data = ? WHERE owner_user_id = ?').run(JSON.stringify({ visibility: 'draft' }), 'active')
    assert.deepEqual((await (await handlePublic(request, env, ['character-owners'])).json()).data, [])
  } finally { db.close() }
})

test('Vite owners route matches Worker projection and reflects live data', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'woltar-carousel-test-'))
  try {
    await mkdir(path.join(root, 'plugins/data'), { recursive: true })
    await mkdir(path.join(root, 'src/data'), { recursive: true })
    await writeFile(path.join(root, 'plugins/data/users.json'), JSON.stringify(users))
    const characterFile = path.join(root, 'src/data/characters.json')
    await writeFile(characterFile, JSON.stringify(characters))
    let handler
    woltarPublic().configureServer({ config: { root }, middlewares: { use: (route, callback) => { assert.equal(route, '/__public/api'); handler = callback } } })
    const read = async () => {
      let body
      const response = { setHeader() {}, end: (value) => { body = JSON.parse(value) } }
      await handler({ url: '/character-owners', method: 'GET' }, response)
      assert.equal(response.statusCode, 200)
      return body.data
    }
    assert.deepEqual(await read(), expected)
    await writeFile(characterFile, '[]')
    assert.deepEqual(await read(), [])
  } finally {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()))
    assert(path.basename(root).startsWith('woltar-carousel-test-'))
    await rm(root, { recursive: true, force: true })
  }
})
